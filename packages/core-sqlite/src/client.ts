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

function migrateIfNeeded(sqlite: Database.Database): void {
  const currentVersion = sqlite.pragma("user_version", {
    simple: true,
  }) as number;

  if (currentVersion >= CURRENT_SCHEMA_VERSION) return;

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

  if (currentVersion < CURRENT_SCHEMA_VERSION) {
    sqlite.exec("DROP TABLE IF EXISTS sessions");
    sqlite.exec(CREATE_TABLES_SQL);
  }

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
