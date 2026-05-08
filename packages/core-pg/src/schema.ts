import { pgTable, text, integer, bigint, real } from "drizzle-orm/pg-core";

export const CURRENT_SCHEMA_VERSION = 3;

// 設計 v0.2 §2.3: Phase A は Postgres 側も text JSON 文字列化 (jsonb は Phase B Defer)
// 設計 v0.2 §2.4: SQLite ↔ Postgres の Equal 型 assert は drizzle-orm の
// sqliteTable / pgTable $inferSelect 型差 (integer/text の生成型) のため
// 次セッション以降の調査 + 修正で復活予定 (ランタイム互換性は §2.6 pglite
// roundtrip test で補完)
//
// 2026-05-08 pglite roundtrip test (Phase A 着手前確認 v0.2、深町論点 1) で
// Critical 検出: `mtime_ms` / `cached_at` の Date.now() ミリ秒値 (13 桁) が
// PostgreSQL の INTEGER (32-bit, max 2^31-1 = 2,147,483,647) を overflow。
// SQLite 側は integer 無限精度のため発生しないが、Postgres は固定幅。
// → bigint mode "number" で 2^53 未満は安全に number 扱い、JS ランタイム
// 互換性維持。
export const sessions = pgTable("sessions", {
  sessionId: text("session_id").primaryKey(),
  filePath: text("file_path").notNull(),
  mtimeMs: bigint("mtime_ms", { mode: "number" }).notNull(),
  cachedAt: bigint("cached_at", { mode: "number" }).notNull(),
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

export type SessionRow = typeof sessions.$inferSelect;

// 設計 v0.2 §2.4: SessionRow → SessionAggregate の型互換は cache.ts の
// `function rowToCachedAggregate(row: SessionRow): CachedSessionAggregate`
// 関数シグネチャで compile time に保証される。Turbopack キャッシュ汚染リスク
// 回避のため専用 assert 型エイリアスは削除、関数型シグネチャで代替。
