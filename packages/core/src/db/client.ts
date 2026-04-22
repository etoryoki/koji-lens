import Database from "better-sqlite3";
import {
  drizzle,
  type BetterSQLite3Database,
} from "drizzle-orm/better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { CREATE_TABLES_SQL } from "./schema.js";

export function defaultCacheDbPath(): string {
  return path.join(homedir(), ".koji-lens", "cache.db");
}

export interface OpenCacheDbResult {
  sqlite: Database.Database;
  db: BetterSQLite3Database;
  close: () => void;
}

export function openCacheDb(filePath?: string): OpenCacheDbResult {
  const resolved = filePath ?? defaultCacheDbPath();
  if (resolved !== ":memory:") {
    const dir = path.dirname(resolved);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }
  const sqlite = new Database(resolved);
  sqlite.pragma("journal_mode = WAL");
  sqlite.exec(CREATE_TABLES_SQL);
  const db = drizzle(sqlite);
  return {
    sqlite,
    db,
    close: () => sqlite.close(),
  };
}
