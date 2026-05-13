import { config as loadEnv } from "dotenv";
import type { Config } from "drizzle-kit";

// 5/07 CEO 決裁 (`ceo/decisions/2026-05-07-drizzle-schema-hybrid-decision.md`):
// 第 3 案ハイブリッド採用 = SQLite 側 (core-sqlite) PRAGMA user_version 維持 +
// Postgres 側 (core-pg) 最初から drizzle-kit migration で構成。
//
// DATABASE_URL は環境変数経由のみ (process.env)、設定ファイル内に値を埋め込まない。
// CEO は drizzle-kit generate (schema → SQL ファイル生成、DB アクセスなし) まで完遂、
// drizzle-kit migrate (実 DB 適用) は DATABASE_URL を持つオーナー実行
// (memory `feedback_secrets_handling.md` 整合)。
//
// drizzle-kit はデフォルトで .env を自動読み込みしないため、dotenv で
// `packages/core-pg/.env.local` を明示読み込み (5/11 Phase A Step 4 既存配置整合)。
loadEnv({ path: ".env.local" });

export default {
  schema: "./src/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
} satisfies Config;
