/**
 * `koji-lens status` コマンド (5/13 自動同期設計 v0.3 Step 9)
 *
 * sync 状態を表示 + lastSyncError があれば詳細 + 復旧手順を表示。
 * 白川 Designer 失敗通知設計 = statusline 起点 → CLI で詳細確認 → 復旧 flow の中核。
 *
 * 出力例:
 *   (健全時)
 *   ログインユーザー: user_xxx
 *   最終同期: 3 分前 (2026-05-13 17:45)
 *   状態: 正常
 *
 *   (失敗時)
 *   ログインユーザー: user_xxx
 *   最終同期: 2 時間前 (2026-05-13 15:00)
 *   状態: エラー
 *
 *   エラー詳細:
 *     認証情報の有効期限が切れました。
 *
 *   復旧手順:
 *     `koji-lens login` で再認証してください。
 */

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const AUTH_FILE = path.join(homedir(), ".koji-lens", "auth.json");
const SYNC_STATE_FILE = path.join(homedir(), ".koji-lens", "sync-state.json");

interface AuthFile {
  clerkUserId: string;
  expiresAt: number;
  baseUrl: string;
  loggedInAt: number;
}

interface SyncStateFile {
  lastSyncedCachedAt: number;
  lastSyncedAt: number;
  lastSyncError: { message: string; timestamp: number } | null;
}

function formatRelative(ms: number): string {
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec} 秒前`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} 分前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 時間前`;
  const day = Math.floor(hr / 24);
  return `${day} 日前`;
}

function formatAbsolute(timestamp: number): string {
  const d = new Date(timestamp);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function inferRecoveryHint(message: string): string {
  if (message.includes("認証") || message.includes("login")) {
    return "`koji-lens login` で再認証してください。";
  }
  if (message.includes("Pro 機能")) {
    return "GA 後は Pro プランへのアップグレードが必要です。";
  }
  if (message.includes("HTTP 5") || message.includes("ECONNREFUSED")) {
    return "サーバー側の一時的な問題の可能性があります。しばらく待ってから `koji-lens sync` を再実行してください。";
  }
  return "問題が続く場合は `koji-lens sync --dry-run` で詳細を確認してください。";
}

export async function statusCommand(): Promise<void> {
  // 未ログイン状態
  if (!existsSync(AUTH_FILE)) {
    console.log("状態: 未ログイン");
    console.log("");
    console.log("クラウド同期を有効化するには `koji-lens login` を実行してください。");
    return;
  }

  let auth: AuthFile;
  try {
    auth = JSON.parse(readFileSync(AUTH_FILE, "utf8")) as AuthFile;
  } catch {
    console.log("状態: 認証情報読み込みエラー");
    console.log("");
    console.log("`koji-lens login` で再認証してください。");
    return;
  }

  console.log(`ログインユーザー: ${auth.clerkUserId}`);

  // 認証期限切れ
  if (auth.expiresAt < Date.now()) {
    console.log(`認証有効期限: ${formatAbsolute(auth.expiresAt)} (期限切れ)`);
    console.log("状態: 認証期限切れ");
    console.log("");
    console.log("復旧手順:");
    console.log("  `koji-lens login` で再認証してください。");
    return;
  }

  // sync-state.json 未作成 (login 後初回 sync 前)
  if (!existsSync(SYNC_STATE_FILE)) {
    console.log("最終同期: 未実施");
    console.log("状態: 同期待機中");
    console.log("");
    console.log("`koji-lens sync` で初回同期を実行してください。");
    return;
  }

  let state: SyncStateFile;
  try {
    state = JSON.parse(readFileSync(SYNC_STATE_FILE, "utf8")) as SyncStateFile;
  } catch {
    console.log("最終同期: 状態ファイル読み込みエラー");
    console.log("");
    console.log("`koji-lens sync` で再同期してください。");
    return;
  }

  const lastSyncedAt = state.lastSyncedAt ?? 0;
  if (lastSyncedAt > 0) {
    const age = Date.now() - lastSyncedAt;
    console.log(
      `最終同期: ${formatRelative(age)} (${formatAbsolute(lastSyncedAt)})`,
    );
  } else {
    console.log("最終同期: 未実施");
  }

  if (state.lastSyncError) {
    console.log("状態: エラー");
    console.log("");
    console.log("エラー詳細:");
    console.log(`  ${state.lastSyncError.message}`);
    console.log("");
    console.log("復旧手順:");
    console.log(`  ${inferRecoveryHint(state.lastSyncError.message)}`);
    return;
  }

  // 24h 以上未同期 = stale 警告
  const STALE_MS = 24 * 60 * 60 * 1000;
  if (lastSyncedAt > 0 && Date.now() - lastSyncedAt > STALE_MS) {
    console.log("状態: データが古い (24 時間以上未同期)");
    console.log("");
    console.log("`koji-lens sync` で最新化、または自動同期を有効化してください。");
    console.log("(自動同期は `koji-lens login` で再有効化可能)");
    return;
  }

  console.log("状態: 正常");
}
