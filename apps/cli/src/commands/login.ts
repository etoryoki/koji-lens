/**
 * `koji-lens login` コマンド
 *
 * 5/13 クラウド同期 CLI sync 設計 v0.2 §2.1 + §3.2 整合、白川 Designer コピー
 * v0.1 採用。
 *
 * フロー:
 * 1. ブラウザ起動で `https://lens.kojihq.com/app/cli-connect` 開く
 * 2. ユーザーが Web 側で「接続コードを発行する」 → UUID v4 表示
 * 3. ユーザーがコピー → CLI に貼り付け
 * 4. CLI が POST `/api/cli-token-verify` で検証 + clerk_user_id 取得
 * 5. `~/.koji-lens/auth.json` に保存 (chmod 0o600)
 */

import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  renameSync,
  chmodSync,
} from "node:fs";
import { homedir, platform } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

const DEFAULT_BASE_URL = "https://lens.kojihq.com/app";
const AUTH_DIR = path.join(homedir(), ".koji-lens");
const AUTH_FILE = path.join(AUTH_DIR, "auth.json");
const CLAUDE_SETTINGS_FILE = path.join(homedir(), ".claude", "settings.json");
const HOOK_COMMAND = "koji-lens sync --background";

export interface LoginOptions {
  baseUrl?: string;
  // テスト用: token を引数で直接渡す (browser スキップ)
  token?: string;
  // テスト用: hooks 自動登録プロンプトをスキップ ("yes" / "no" 直接指定)
  autoSync?: "yes" | "no";
}

/**
 * Claude Code settings.json の hooks 構造 (5/13 自動同期設計 v0.3 Step 5)。
 *
 * `~/.claude/settings.json` の `hooks.Stop` に koji-lens sync --background
 * を別プロセス起動する hook を登録する。既存設定は **マージ**、上書き禁止。
 */
interface ClaudeHookConfig {
  type: string;
  command: string;
}

interface ClaudeHookGroup {
  matcher?: string;
  hooks: ClaudeHookConfig[];
}

interface ClaudeSettings {
  hooks?: {
    Stop?: ClaudeHookGroup[];
    [event: string]: ClaudeHookGroup[] | undefined;
  };
  [key: string]: unknown;
}

function loadClaudeSettings(): ClaudeSettings {
  if (!existsSync(CLAUDE_SETTINGS_FILE)) {
    return {};
  }
  try {
    const raw = readFileSync(CLAUDE_SETTINGS_FILE, "utf8");
    return JSON.parse(raw) as ClaudeSettings;
  } catch {
    return {};
  }
}

/**
 * Atomic write to ~/.claude/settings.json (深町 Nit 1 と同型、ユーザー個人設定
 * への侵襲は最小限 = atomic 保証必須)。
 */
function saveClaudeSettings(settings: ClaudeSettings): void {
  const dir = path.dirname(CLAUDE_SETTINGS_FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const tmpPath = CLAUDE_SETTINGS_FILE + ".tmp";
  writeFileSync(tmpPath, JSON.stringify(settings, null, 2), "utf8");
  renameSync(tmpPath, CLAUDE_SETTINGS_FILE);
}

/**
 * settings.hooks.Stop に koji-lens sync --background を登録 (既存マージ、
 * 重複登録回避)。既存 hooks 設定は触らない。
 */
function registerSyncHook(settings: ClaudeSettings): ClaudeSettings {
  const hooks = settings.hooks ?? {};
  const stopHooks: ClaudeHookGroup[] = hooks.Stop ?? [];

  // 既存登録チェック (重複回避)
  const alreadyRegistered = stopHooks.some((group) =>
    group.hooks.some(
      (h) => h.type === "command" && h.command === HOOK_COMMAND,
    ),
  );
  if (alreadyRegistered) {
    return settings;
  }

  // 既存マッチャー "" のグループに append、なければ新規グループ追加
  const emptyMatcherGroup = stopHooks.find(
    (group) => group.matcher === "" || group.matcher === undefined,
  );
  if (emptyMatcherGroup) {
    emptyMatcherGroup.hooks.push({ type: "command", command: HOOK_COMMAND });
  } else {
    stopHooks.push({
      matcher: "",
      hooks: [{ type: "command", command: HOOK_COMMAND }],
    });
  }

  return {
    ...settings,
    hooks: { ...hooks, Stop: stopHooks },
  };
}

/**
 * `koji-lens login` 成功後に「自動同期を有効化しますか? (Y/n)」プロンプトを
 * 表示し、Y なら ~/.claude/settings.json の hooks.Stop に koji-lens sync
 * --background を登録 (鷹野 COO Warning 1 = β 期間中の明示的同意 UX 整合)。
 */
async function promptAndRegisterHook(autoSyncOverride?: "yes" | "no"): Promise<void> {
  let answer: string;
  if (autoSyncOverride) {
    answer = autoSyncOverride === "yes" ? "y" : "n";
  } else {
    const rl = readline.createInterface({ input: stdin, output: stdout });
    try {
      console.log("");
      console.log(
        "自動同期を有効化すると、Claude Code セッション終了時に裏で sync が走ります。",
      );
      console.log(
        "(設定ファイル: ~/.claude/settings.json の hooks.Stop に追記、いつでも削除可能)",
      );
      answer = await rl.question("自動同期を有効化しますか? (Y/n): ");
    } finally {
      rl.close();
    }
  }

  const trimmed = answer.trim().toLowerCase();
  // デフォルト Yes (空入力含む)、明示的に n / no で skip
  if (trimmed === "n" || trimmed === "no") {
    console.log("");
    console.log(
      "自動同期はスキップしました。必要なときに `koji-lens sync` を実行してください。",
    );
    return;
  }

  const settings = loadClaudeSettings();
  const updated = registerSyncHook(settings);

  if (updated === settings) {
    console.log("");
    console.log("自動同期は既に有効です。設定変更なし。");
    return;
  }

  saveClaudeSettings(updated);
  console.log("");
  console.log("自動同期を有効化しました。次回 Claude Code セッション終了時から動作します。");
  console.log(
    "(無効化したい場合は ~/.claude/settings.json から該当 hook を削除してください)",
  );
}

interface VerifyResponse {
  clerkUserId: string;
  expiresAt: number;
}

interface AuthFile {
  token: string;
  clerkUserId: string;
  expiresAt: number;
  baseUrl: string;
  loggedInAt: number;
}

function openBrowser(url: string): void {
  // クロスプラットフォーム browser open
  // (open package 依存追加せず、OS 別コマンドで実装)
  const os = platform();
  let cmd: string;
  let args: string[];
  if (os === "win32") {
    cmd = "cmd";
    args = ["/c", "start", "", url];
  } else if (os === "darwin") {
    cmd = "open";
    args = [url];
  } else {
    cmd = "xdg-open";
    args = [url];
  }
  try {
    const child = spawn(cmd, args, {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
  } catch (err) {
    console.warn(
      `[login] ブラウザの自動起動に失敗しました。手動で URL を開いてください: ${url}`,
    );
  }
}

async function verifyToken(
  token: string,
  baseUrl: string,
): Promise<VerifyResponse> {
  const res = await fetch(`${baseUrl}/api/cli-token-verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (res.status === 404) {
    throw new Error(
      "接続コードが見つかりません。コードを正しくコピーしたか確認してください。",
    );
  }
  if (res.status === 410) {
    throw new Error(
      "接続コードの有効期限が切れています。再度発行してください。",
    );
  }
  if (!res.ok) {
    throw new Error(`接続コードの検証に失敗しました (${res.status})`);
  }
  return (await res.json()) as VerifyResponse;
}

function saveAuth(authData: AuthFile): void {
  if (!existsSync(AUTH_DIR)) {
    mkdirSync(AUTH_DIR, { recursive: true });
  }
  writeFileSync(AUTH_FILE, JSON.stringify(authData, null, 2), "utf8");
  try {
    chmodSync(AUTH_FILE, 0o600);
  } catch {
    // Windows 等で chmod が無効でも続行 (ファイルシステム依存)
  }
}

export async function loginCommand(options: LoginOptions = {}): Promise<void> {
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const connectUrl = `${baseUrl}/cli-connect`;

  let token: string;

  if (options.token) {
    // テスト用: token を引数で直接渡す
    token = options.token.trim();
  } else {
    console.log(`ブラウザで ${connectUrl} を開いています...`);
    console.log(`ブラウザが開かない場合は上の URL を手動で開いてください。`);
    console.log("");
    openBrowser(connectUrl);

    const rl = readline.createInterface({ input: stdin, output: stdout });
    try {
      const answer = await rl.question("接続コードを貼り付けてください: ");
      token = answer.trim();
    } finally {
      rl.close();
    }
  }

  if (!token) {
    throw new Error("接続コードが入力されていません。");
  }

  // UUID v4 の hyphen が省略される表示形式 (4-4-4-4-4-4-4-4 等) に対応
  // → hex のみを抽出して標準 UUID 形式 (8-4-4-4-12) に再構築
  const hexOnly = token.replace(/-/g, "").toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(hexOnly)) {
    // hex 形式でなければ元の token をそのまま使う (将来別形式対応のため)
    // ただし長さチェック
    if (token.length < 30 || token.length > 100) {
      throw new Error("接続コードの形式が正しくありません。");
    }
  } else {
    // 標準 UUID 形式に再構築
    token = `${hexOnly.slice(0, 8)}-${hexOnly.slice(8, 12)}-${hexOnly.slice(
      12,
      16,
    )}-${hexOnly.slice(16, 20)}-${hexOnly.slice(20, 32)}`;
  }

  console.log("");
  console.log("接続中...");

  const verify = await verifyToken(token, baseUrl);

  saveAuth({
    token,
    clerkUserId: verify.clerkUserId,
    expiresAt: verify.expiresAt,
    baseUrl,
    loggedInAt: Date.now(),
  });

  const expiryDate = new Date(verify.expiresAt);
  console.log(
    `ログインしました。\`koji-lens sync\` でデータを同期できます。`,
  );
  console.log(
    `(認証情報: ${AUTH_FILE}、有効期限: ${expiryDate.toLocaleDateString("ja-JP")})`,
  );

  // 5/13 自動同期設計 v0.3 Step 5: 明示的同意で hooks 自動登録 (β 期間中の
  // 信頼関係維持、鷹野 COO Warning 1 整合)
  try {
    await promptAndRegisterHook(options.autoSync);
  } catch (err) {
    // hooks 登録失敗は login 成功扱い (ユーザーは手動 sync で復旧可能)
    console.warn(
      `[login] 自動同期の登録に失敗しました: ${err instanceof Error ? err.message : err}`,
    );
    console.warn(
      "手動で `koji-lens sync` を実行するか、後で `koji-lens login` を再実行してください。",
    );
  }
}
