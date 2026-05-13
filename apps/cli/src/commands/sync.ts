/**
 * `koji-lens sync` コマンド
 *
 * 5/13 クラウド同期 CLI sync 設計 v0.2 §2.4 + §3 整合。
 * 深町 CTO Warning 1-3 + 白川 Designer コピー v0.1 採用。
 *
 * フロー:
 * 1. `~/.koji-lens/auth.json` から opaque token + baseUrl 読み込み
 * 2. `~/.koji-lens/sync-state.json` から last_synced_cached_at 読み込み (初回は 0)
 * 3. cache.db から WHERE cached_at > last_synced_cached_at の rows SELECT
 * 4. filePath anonymize (seed-fixture.ts と同型 SHA-256 + project 連番)
 * 5. 50 件/batch で POST /api/sync (Authorization: Bearer)
 * 6. 進捗表示 + 各 batch で exponential backoff リトライ (最大 3 回)
 * 7. 全 batch 成功で sync-state.json 更新 + 完了表示
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { openCacheDb } from "@kojihq/core-sqlite";

const AUTH_DIR = path.join(homedir(), ".koji-lens");
const AUTH_FILE = path.join(AUTH_DIR, "auth.json");
const SYNC_STATE_FILE = path.join(AUTH_DIR, "sync-state.json");
const DEFAULT_BATCH_SIZE = 50;
const MAX_RETRIES = 3;

interface AuthFile {
  token: string;
  clerkUserId: string;
  expiresAt: number;
  baseUrl: string;
  loggedInAt: number;
}

interface SyncState {
  lastSyncedCachedAt: number;
  lastSyncedAt: number;
}

interface SessionRow {
  session_id: string;
  file_path: string;
  mtime_ms: number;
  cached_at: number;
  started_at: string | null;
  ended_at: string | null;
  duration_ms: number;
  assistant_turns: number;
  user_turns: number;
  sidechain_count: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_create_tokens: number;
  cost_usd: number;
  models_json: string;
  tools_json: string;
  costs_by_model_json: string;
  model_changes_json: string;
  latency_p50_ms: number;
  latency_p95_ms: number;
}

export interface SyncOptions {
  batchSize?: number;
  dryRun?: boolean;
}

function loadAuth(): AuthFile {
  if (!existsSync(AUTH_FILE)) {
    throw new Error(
      `認証情報が見つかりません。\`koji-lens login\` を実行してください。\n(期待パス: ${AUTH_FILE})`,
    );
  }
  const raw = readFileSync(AUTH_FILE, "utf8");
  const auth = JSON.parse(raw) as AuthFile;
  if (auth.expiresAt < Date.now()) {
    throw new Error(
      "認証情報の有効期限が切れました。`koji-lens login` で再認証してください。",
    );
  }
  return auth;
}

function loadSyncState(): SyncState {
  if (!existsSync(SYNC_STATE_FILE)) {
    return { lastSyncedCachedAt: 0, lastSyncedAt: 0 };
  }
  try {
    const raw = readFileSync(SYNC_STATE_FILE, "utf8");
    return JSON.parse(raw) as SyncState;
  } catch {
    return { lastSyncedCachedAt: 0, lastSyncedAt: 0 };
  }
}

function saveSyncState(state: SyncState): void {
  if (!existsSync(AUTH_DIR)) {
    mkdirSync(AUTH_DIR, { recursive: true });
  }
  writeFileSync(SYNC_STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}

/**
 * filePath を anonymize (seed-fixture.ts と同型ロジック、設計 v0.2 §5.4 採用)
 */
function buildAnonymizer(): (filePath: string) => string {
  const projectMap = new Map<string, number>();
  const sessionPerProject = new Map<number, number>();
  let nextProjectIdx = 1;

  return (filePath: string) => {
    const projectDir = path.dirname(filePath);
    if (!projectMap.has(projectDir)) {
      projectMap.set(projectDir, nextProjectIdx++);
    }
    const projectIdx = projectMap.get(projectDir)!;
    const sessionIdx = (sessionPerProject.get(projectIdx) ?? 0) + 1;
    sessionPerProject.set(projectIdx, sessionIdx);
    return `/home/user/.claude/projects/project-${projectIdx}/session-${sessionIdx}.jsonl`;
  };
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postBatch(
  baseUrl: string,
  token: string,
  sessions: SessionRow[],
): Promise<{ upserted: number; total: number }> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(`${baseUrl}/api/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sessions }),
      });
      if (res.ok) {
        return (await res.json()) as { upserted: number; total: number };
      }
      if (res.status === 401 || res.status === 410) {
        throw new Error(
          "認証情報が無効/期限切れです。`koji-lens login` で再認証してください。",
        );
      }
      if (res.status === 403) {
        throw new Error(
          "Pro 機能アクセス権限がありません。GA 後は Pro プランへのアップグレードが必要です。",
        );
      }
      lastErr = new Error(`HTTP ${res.status}: ${await res.text()}`);
    } catch (err) {
      lastErr = err;
    }
    // exponential backoff: 1s → 2s → 4s
    const delay = 1000 * Math.pow(2, attempt);
    if (attempt < MAX_RETRIES - 1) {
      console.warn(
        `[sync] バッチ送信に失敗 (試行 ${attempt + 1}/${MAX_RETRIES})、${delay / 1000}s 後にリトライ...`,
      );
      await sleep(delay);
    }
  }
  throw lastErr ?? new Error("Unknown sync error");
}

export async function syncCommand(options: SyncOptions = {}): Promise<void> {
  // batchSize 決定 (NaN 回避): options.batchSize > env > default の優先順位
  // 注意: `Number(undefined) = NaN` で `??` を fall-through しないため明示分岐
  let batchSize = DEFAULT_BATCH_SIZE;
  if (typeof options.batchSize === "number" && options.batchSize > 0) {
    batchSize = options.batchSize;
  } else if (process.env.KOJI_LENS_SYNC_BATCH_SIZE) {
    const envVal = Number(process.env.KOJI_LENS_SYNC_BATCH_SIZE);
    if (Number.isFinite(envVal) && envVal > 0) batchSize = envVal;
  }

  const auth = loadAuth();
  const state = loadSyncState();

  console.log(
    `ログインユーザー: ${auth.clerkUserId} / 前回同期以降のセッションを送信します...`,
  );

  const { sqlite, close } = openCacheDb();
  let rows: SessionRow[];
  try {
    rows = sqlite
      .prepare(
        `SELECT
          session_id, file_path, mtime_ms, cached_at, started_at, ended_at,
          duration_ms, assistant_turns, user_turns, sidechain_count,
          input_tokens, output_tokens, cache_read_tokens, cache_create_tokens,
          cost_usd, models_json, tools_json, costs_by_model_json,
          model_changes_json, latency_p50_ms, latency_p95_ms
        FROM sessions
        WHERE cached_at > ?
        ORDER BY cached_at ASC`,
      )
      .all(state.lastSyncedCachedAt) as SessionRow[];
  } finally {
    close();
  }

  if (rows.length === 0) {
    console.log("同期するセッションはありません (前回同期から変更なし)。");
    return;
  }

  // filePath anonymize
  const anonymize = buildAnonymizer();
  const anonymized = rows.map((r) => ({
    ...r,
    file_path: anonymize(r.file_path),
  }));

  if (options.dryRun) {
    console.log(
      `[dry-run] ${anonymized.length} セッションを送信予定 (${Math.ceil(
        anonymized.length / batchSize,
      )} バッチ、${batchSize} 件/バッチ)`,
    );
    console.log(`送信先: ${auth.baseUrl}/api/sync`);
    console.log(
      `サンプル file_path (anonymized): ${anonymized[0]?.file_path ?? "N/A"}`,
    );
    return;
  }

  let totalUpserted = 0;
  let maxCachedAt = state.lastSyncedCachedAt;

  for (let i = 0; i < anonymized.length; i += batchSize) {
    const batch = anonymized.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(anonymized.length / batchSize);

    console.log(
      `バッチ ${batchNum}/${totalBatches} 送信中 (${batch.length} 件)...`,
    );

    const result = await postBatch(auth.baseUrl, auth.token, batch);
    totalUpserted += result.upserted;

    for (const r of batch) {
      if (r.cached_at > maxCachedAt) maxCachedAt = r.cached_at;
    }
  }

  saveSyncState({
    lastSyncedCachedAt: maxCachedAt,
    lastSyncedAt: Date.now(),
  });

  console.log("");
  console.log(
    `同期完了 — ${totalUpserted} セッションを送信しました (新規 ${anonymized.length} 件)`,
  );
  console.log(`ダッシュボードで確認: ${auth.baseUrl}/compare`);
}
