/**
 * `koji-lens logout` — Pro のログイン情報をこの PC から削除する (2026-09-24 queue)
 *
 * 背景: ログアウト手段がなく、Pro 停止後も auth.json が残ると lazy sync が失敗し続け
 * statusline に `sync failed` が出続けた (9/24 オーナー環境、手動削除で解消)。
 *
 * 削除対象: ~/.koji-lens/auth.json (認証情報) / sync-state.json (+ .tmp、同期の記録)。
 * ローカルのキャッシュ (cache.db) や設定 (config.json) は残す。
 * サーバー側のトークンは失効させない (ローカルの情報を消すだけ)。
 */

import { existsSync, unlinkSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const AUTH_DIR = path.join(homedir(), ".koji-lens");
const FILES = [
  path.join(AUTH_DIR, "auth.json"),
  path.join(AUTH_DIR, "sync-state.json"),
  path.join(AUTH_DIR, "sync-state.json.tmp"),
];

export function logoutCommand(): void {
  const removed: string[] = [];
  for (const file of FILES) {
    if (!existsSync(file)) continue;
    unlinkSync(file);
    removed.push(file);
  }
  if (removed.length === 0) {
    console.log("ログインしていません (削除するログイン情報はありませんでした)。");
    return;
  }
  console.log("ログアウトしました。次のファイルを削除しました:");
  for (const file of removed) console.log(`  ${file}`);
  console.log("ローカルのキャッシュと設定は残っています。再度使うときは `koji-lens login` を実行してください。");
}
