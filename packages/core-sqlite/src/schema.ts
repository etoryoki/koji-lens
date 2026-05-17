import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const CURRENT_SCHEMA_VERSION = 4;

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
  costsByModelJson: text("costs_by_model_json").notNull().default("{}"),
  modelChangesJson: text("model_changes_json").notNull().default("[]"),
  latencyP50Ms: integer("latency_p50_ms").notNull().default(0),
  latencyP95Ms: integer("latency_p95_ms").notNull().default(0),
});

// 2026-05-17 v4 追加: audit_events_cache (改善案 A、PII redaction 済 events を file 単位 cache、cache hit -75-88%)
export const auditEventsCache = sqliteTable("audit_events_cache", {
  filePath: text("file_path").primaryKey(),
  fileMtimeMs: integer("file_mtime_ms").notNull(),
  fileSize: integer("file_size").notNull(),
  eventsJson: text("events_json").notNull(), // AuditEvent[] JSON serialized
  cachedAt: integer("cached_at").notNull(),
});

export type AuditEventsCacheRow = typeof auditEventsCache.$inferSelect;

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
  tools_json TEXT NOT NULL DEFAULT '{}',
  costs_by_model_json TEXT NOT NULL DEFAULT '{}',
  model_changes_json TEXT NOT NULL DEFAULT '[]',
  latency_p50_ms INTEGER NOT NULL DEFAULT 0,
  latency_p95_ms INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sessions_ended_at ON sessions(ended_at);
CREATE TABLE IF NOT EXISTS audit_events_cache (
  file_path TEXT PRIMARY KEY,
  file_mtime_ms INTEGER NOT NULL,
  file_size INTEGER NOT NULL,
  events_json TEXT NOT NULL,
  cached_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_cache_mtime ON audit_events_cache(file_mtime_ms);
`;

export type SessionRow = typeof sessions.$inferSelect;

// 設計 v0.2 §2.4: SessionRow → SessionAggregate の型互換は cache.ts の
// `function rowToCachedAggregate(row: SessionRow): CachedSessionAggregate`
// 関数シグネチャで compile time に保証される (CachedSessionAggregate extends
// SessionAggregate)。専用 assert 型エイリアスは Turbopack キャッシュ汚染リスク
// 回避のため削除、関数型シグネチャで代替。
