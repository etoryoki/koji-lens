import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const sessions = sqliteTable("sessions", {
  sessionId: text("session_id").primaryKey(),
  filePath: text("file_path").notNull(),
  mtimeMs: integer("mtime_ms").notNull(),
  cachedAt: integer("cached_at").notNull(),
  startedAt: text("started_at"),
  endedAt: text("ended_at"),
  durationMs: integer("duration_ms").notNull().default(0),
  assistantTurns: integer("assistant_turns").notNull().default(0),
  userTurns: integer("user_turns").notNull().default(0),
  sidechainCount: integer("sidechain_count").notNull().default(0),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  cacheReadTokens: integer("cache_read_tokens").notNull().default(0),
  cacheCreateTokens: integer("cache_create_tokens").notNull().default(0),
  costUsd: real("cost_usd").notNull().default(0),
  modelsJson: text("models_json").notNull().default("{}"),
  toolsJson: text("tools_json").notNull().default("{}"),
});

export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  file_path TEXT NOT NULL,
  mtime_ms INTEGER NOT NULL,
  cached_at INTEGER NOT NULL,
  started_at TEXT,
  ended_at TEXT,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  assistant_turns INTEGER NOT NULL DEFAULT 0,
  user_turns INTEGER NOT NULL DEFAULT 0,
  sidechain_count INTEGER NOT NULL DEFAULT 0,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cache_read_tokens INTEGER NOT NULL DEFAULT 0,
  cache_create_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL DEFAULT 0,
  models_json TEXT NOT NULL DEFAULT '{}',
  tools_json TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_sessions_ended_at ON sessions(ended_at);
`;
