import Database from "better-sqlite3";
import {
  drizzle,
  type BetterSQLite3Database,
} from "drizzle-orm/better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { CREATE_TABLES_SQL, CURRENT_SCHEMA_VERSION } from "./schema.js";

export function defaultCacheDbPath(): string {
  return path.join(homedir(), ".koji-lens", "cache.db");
}

export interface OpenCacheDbResult {
  sqlite: Database.Database;
  db: BetterSQLite3Database;
  close: () => void;
}

// 5/07 CEO 決裁 (`ceo/decisions/2026-05-07-drizzle-schema-hybrid-decision.md`)
// 深町 CTO Critical 2 対処: DROP TABLE 方式は history テーブル等の新規テーブル
// 追加後にデータ喪失する。よって v3 以上では DROP TABLE 禁止、incremental
// migration (CREATE TABLE IF NOT EXISTS / ALTER TABLE ADD COLUMN) で対応する。
//
// 現状 CURRENT_SCHEMA_VERSION = 3、β ユーザー全員 v3 で稼働中のため v0-2 path は
// 現実的に通らないが、新規 DB 初期化 + 旧 β ユーザー復帰時の保険として保持。
//
// 将来 v4+ で新テーブル追加するとき (節約ダッシュ Phase B 5/22-26 history テーブル
// 等) は、§ v3 → v4+ incremental migrations セクションに新 if ブロックを追加し、
// DROP TABLE は絶対に使わない。

function migrateIfNeeded(sqlite: Database.Database): void {
  const currentVersion = sqlite.pragma("user_version", {
    simple: true,
  }) as number;

  if (currentVersion >= CURRENT_SCHEMA_VERSION) return;

  // ----- v0 path: 新規 DB 初期化 (テーブルなし) -----
  if (currentVersion === 0) {
    const tableCount = sqlite
      .prepare(
        "SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name='sessions'",
      )
      .get() as { n: number };
    if (tableCount.n === 0) {
      sqlite.exec(CREATE_TABLES_SQL);
      sqlite.pragma(`user_version = ${CURRENT_SCHEMA_VERSION}`);
      return;
    }
  }

  // ----- v0-2 → v3 path: レガシー DB 再構築 (DROP TABLE 許容) -----
  // v3 以上のテーブルは存在しない前提のため DROP TABLE しても他テーブル喪失なし。
  // β ユーザー全員 v3 で稼働中のため現実的にはこの path は通らない。
  if (currentVersion < 3) {
    sqlite.exec("DROP TABLE IF EXISTS sessions");
    sqlite.exec(CREATE_TABLES_SQL);
    sqlite.pragma(`user_version = 3`);
  }

  // ----- v3 → v4+ incremental migrations (DROP TABLE 禁止) -----
  // 新テーブル追加 / カラム追加は CREATE TABLE IF NOT EXISTS / ALTER TABLE ADD
  // COLUMN で行う。既存 sessions テーブルのデータは絶対に喪失させない。
  //
  // 追加例 (将来の history テーブル新設、節約ダッシュ Phase B 5/22-26):
  // if (currentVersion < 4) {
  //   sqlite.exec(`
  //     CREATE TABLE IF NOT EXISTS history (
  //       id INTEGER PRIMARY KEY AUTOINCREMENT,
  //       period_start TEXT NOT NULL,
  //       period_end TEXT NOT NULL,
  //       ...
  //     );
  //     CREATE INDEX IF NOT EXISTS idx_history_period_start ON history(period_start);
  //   `);
  //   sqlite.pragma(`user_version = 4`);
  // }

  // 全 migration 完了後、最終 version をマーク
  sqlite.pragma(`user_version = ${CURRENT_SCHEMA_VERSION}`);
}

export function openCacheDb(filePath?: string): OpenCacheDbResult {
  const resolved = filePath ?? defaultCacheDbPath();
  if (resolved !== ":memory:") {
    const dir = path.dirname(resolved);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }
  const sqlite = new Database(resolved);
  sqlite.pragma("journal_mode = WAL");
  migrateIfNeeded(sqlite);
  const db = drizzle(sqlite);
  return {
    sqlite,
    db,
    close: () => sqlite.close(),
  };
}
