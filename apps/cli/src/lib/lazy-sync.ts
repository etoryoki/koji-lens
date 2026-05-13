/**
 * Layer B: lazy sync trigger (5/13 自動同期設計 v0.3 §2.2)
 *
 * summary / compare / trend コマンド冒頭で呼ばれ、5 分以上同期されていない
 * かつ login 済の場合に **裏で fire-and-forget** で `koji-lens sync --background`
 * を spawn する (待たない設計)。
 *
 * 設計判断:
 * - 設計 v0.3 §2.2 では「完了まで待って 1-3 秒スピナー表示」だったが、UX 的に
 *   ユーザーが summary 見たい瞬間に待たされる = 体験劣化。fire-and-forget で
 *   裏で走らせ、次回コマンド or 次回 Web ダッシュ閲覧時に反映が筋
 * - 白川 Designer 「ユーザーが何もしなくても状態が更新されていて、見たい時に
 *   見える」(Stripe Radar / Vercel Deploy パターン) と整合
 * - 失敗は silent、`lastSyncError` 経由で statusline に反映 (Step 8-9)
 */

import { existsSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { homedir } from "node:os";
import path from "node:path";

const AUTH_DIR = path.join(homedir(), ".koji-lens");
const AUTH_FILE = path.join(AUTH_DIR, "auth.json");
const SYNC_STATE_FILE = path.join(AUTH_DIR, "sync-state.json");
const THROTTLE_MS = 5 * 60 * 1000;

interface SyncStateSnapshot {
  lastSyncedAt?: number;
}

/**
 * 非同期 sync trigger (fire-and-forget)。
 * - auth.json 不在 (未ログイン) → 即 return
 * - lastSyncedAt が 5 分以内 → throttle で skip
 * - それ以外 → 子プロセスとして `koji-lens sync --background` を detached 起動、
 *   親プロセスは即 return (ユーザーを待たせない)
 */
export function triggerLazySync(): void {
  if (!existsSync(AUTH_FILE)) {
    return;
  }

  let lastSyncedAt = 0;
  if (existsSync(SYNC_STATE_FILE)) {
    try {
      const raw = readFileSync(SYNC_STATE_FILE, "utf8");
      const state = JSON.parse(raw) as SyncStateSnapshot;
      lastSyncedAt = state.lastSyncedAt ?? 0;
    } catch {
      // sync-state.json が壊れていても続行 (新規 sync で上書きされる)
    }
  }

  if (Date.now() - lastSyncedAt < THROTTLE_MS) {
    return;
  }

  try {
    const argv1 = process.argv[1];
    if (!argv1) return;
    const child = spawn(
      process.execPath,
      [argv1, "sync", "--background"],
      {
        detached: true,
        stdio: "ignore",
      },
    );
    child.unref();
  } catch {
    // spawn 失敗は silent (次回 lazy sync trigger で再試行)
  }
}
