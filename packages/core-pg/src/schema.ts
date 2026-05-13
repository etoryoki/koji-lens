import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  integer,
  bigint,
  real,
  boolean,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";

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
export const sessions = pgTable(
  "sessions",
  {
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
    // 5/13 クラウド同期 CLI sync 設計 v0.2 §2.2 整合: ユーザー識別フィールド追加。
    // 深町 CTO Warning 1 採用で FK は MVP 期に張らない (Webhook 信頼性検証完了後の
    // Phase B 安定期に migration で追加)、`clerk_user_id text + index` のみで
    // アプリケーション層整合性担保。
    clerkUserId: text("clerk_user_id"),
  },
  (table) => ({
    clerkUserIdx: index("sessions_clerk_user_idx").on(table.clerkUserId),
  }),
);

export type SessionRow = typeof sessions.$inferSelect;

// 設計 v0.2 §2.4: SessionRow → SessionAggregate の型互換は cache.ts の
// `function rowToCachedAggregate(row: SessionRow): CachedSessionAggregate`
// 関数シグネチャで compile time に保証される。Turbopack キャッシュ汚染リスク
// 回避のため専用 assert 型エイリアスは削除、関数型シグネチャで代替。

// ---------------------------------------------------------------------------
// Pro 機能テーブル (Phase A 後続、5/13 セッション内前倒し、Pro 機能 v0.2 整合)
// ---------------------------------------------------------------------------
// 5/13 セッション内前倒し実装。Pro 機能設計 v0.2 (`ceo/strategy/2026-04-27-pro-feature-redesign-v2.md`)
// 整合の最小構成 = users + subscriptions。Clerk userId を PK 採用 (auth プロバイダ統合点)、
// Stripe Subscription ID = 単一 active sub 設計、created_at/updated_at は bigint ms
// (sessions テーブルの mtime_ms/cached_at 整合、5/08 深町 Critical 検出対処整合)。
//
// Pro v0.3 確定 (Day 30 後の実購買データで判断、queue.md L135) で動機軸変更があっても、
// users + subscriptions の基本構造は影響を受けない (Clerk + Stripe 標準パターン)。

export const users = pgTable(
  "users",
  {
    // Clerk userId (auth プロバイダ統合点、Clerk Webhook で同期)
    clerkUserId: text("clerk_user_id").primaryKey(),
    email: text("email").notNull(),
    // Stripe Checkout 後に Stripe Customer ID を紐付け (Webhook 経由)
    stripeCustomerId: text("stripe_customer_id"),
    // 'free' | 'pro' | 'admin' (Pro 権限ゲートで参照)
    role: text("role").notNull().default("free"),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_idx").on(table.email),
    stripeCustomerIdx: index("users_stripe_customer_idx").on(
      table.stripeCustomerId,
    ),
    // 5/13 深町 CTO 諮問 Warning 1 採用: role 無制約は大文字小文字揺れリスク、
    // 5/13 β 期間 Pro 無料化決裁の GA 切替時 role 一括 UPDATE リスク低減目的で
    // migration 0002 で CHECK 制約追加。values は USER_ROLES 配列と同期。
    roleCheck: check(
      "users_role_check",
      sql`${table.role} IN ('free', 'pro', 'admin')`,
    ),
  }),
);

// pro-gate.ts と同期、role の取りうる値域
export const USER_ROLES = ["free", "pro", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export type UserRow = typeof users.$inferSelect;

export const subscriptions = pgTable(
  "subscriptions",
  {
    // Stripe Subscription ID = 単一 active sub 設計 (1 user = 1 active sub)
    stripeSubscriptionId: text("stripe_subscription_id").primaryKey(),
    // users.clerkUserId への FK (Pro 機能 v0.2 整合、Clerk が auth 統合点)
    clerkUserId: text("clerk_user_id")
      .notNull()
      .references(() => users.clerkUserId),
    stripeCustomerId: text("stripe_customer_id").notNull(),
    // Stripe Subscription status: active / canceled / past_due / unpaid /
    // incomplete / incomplete_expired / trialing / paused
    status: text("status").notNull(),
    // 'monthly' | 'annual' (Pro Individual v0.2 $7/月 + $70/年 整合)
    plan: text("plan").notNull(),
    currentPeriodEnd: bigint("current_period_end", { mode: "number" }).notNull(),
    // Customer Portal で「期間終了で解約」予約した状態 (true 中は status='active' 維持)
    cancelAtPeriodEnd: boolean("cancel_at_period_end")
      .notNull()
      .default(false),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (table) => ({
    clerkUserIdx: index("subscriptions_clerk_user_idx").on(table.clerkUserId),
    statusIdx: index("subscriptions_status_idx").on(table.status),
  }),
);

export type SubscriptionRow = typeof subscriptions.$inferSelect;

// ---------------------------------------------------------------------------
// CLI 接続トークン (5/13 クラウド同期 CLI sync 設計 v0.2 §2.1 整合、深町 CTO
// Critical 1 + 2 採用整合の opaque token 設計)
// ---------------------------------------------------------------------------
// 設計判断: Clerk JWT は CLI 長期保存に不適 (session token TTL 60 秒)、サーバー
// 側で UUID v4 を発行 + DB 管理する opaque token 設計に切替 (深町諮問結果採用)。
// CLI 側は `~/.koji-lens/auth.json` にこの opaque token のみ保存、Authorization
// Bearer header で API Route 認証。token revocation は DB DELETE のみで即時反映。

export const cliTokens = pgTable(
  "cli_tokens",
  {
    // UUID v4 (server-side 生成)
    token: text("token").primaryKey(),
    clerkUserId: text("clerk_user_id")
      .notNull()
      .references(() => users.clerkUserId),
    // 30 日後想定 (Date.now() + 30 * 24 * 60 * 60 * 1000)
    expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    // 最終 sync 時刻 (statistics + 期限延長判断材料)
    lastUsedAt: bigint("last_used_at", { mode: "number" }),
  },
  (table) => ({
    clerkUserIdx: index("cli_tokens_clerk_user_idx").on(table.clerkUserId),
    expiresAtIdx: index("cli_tokens_expires_at_idx").on(table.expiresAt),
  }),
);

export type CliTokenRow = typeof cliTokens.$inferSelect;
