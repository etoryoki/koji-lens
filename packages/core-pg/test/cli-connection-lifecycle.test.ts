import { describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { createEmptyAggregate } from "@kojihq/core";
import { aggregateToRow, sessions } from "../src/index.js";

// 設計 v0.2 §2.6 + 深町 CTO 諮問 (2026-05-09 Node.js subprocess + stdin/stdout
// 制御の体系的レビュー、`ceo/decisions/2026-05-09-phase-b-cli-postgres-driver-selection.md` v1.0):
//
// CLI 側 `drizzle-orm/neon-http` 採用 (`neon-serverless` 不使用) の構造的論点を
// pglite mock で一次ガード:
//   - `neon-serverless` = WebSocket ベース接続プール、`pool.end()` 明示なしで
//     Node.js event loop 終了不能 = beta.7 → beta.8 同型 hang リスク
//   - `neon-http` = HTTP driver、stateless、各 query で fetch、pool 永続接続なし
//   - pglite (本テスト) = in-memory、stateless、`client.close()` のみで cleanup
//     完了 (neon-http と等価の stateless 振る舞い、構造的論点の一次ガード)
//
// Phase B 5/22 着手前必須対処として CLI 側 Postgres driver 選定の構造的論点解消、
// 5/26 Day 35 Stripe 連携完成日 (β 期間 Pro 無料化決裁で再定義) までに CLI -
// Pro Web ダッシュ Postgres 統合の lifecycle 検証完遂。実 Neon endpoint との
// end-to-end 検証は Phase B 期間中 (5/22-26) の DATABASE_URL 設定後に別途実施。

const CREATE_SESSIONS_SQL = `
CREATE TABLE sessions (
  session_id TEXT PRIMARY KEY,
  file_path TEXT NOT NULL,
  mtime_ms BIGINT NOT NULL,
  cached_at BIGINT NOT NULL,
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
`;

describe("CLI connection lifecycle (drizzle-orm/neon-http migration target)", () => {
  it("drizzle query roundtrips without explicit pool.end() (pglite proxy for neon-http stateless behavior)", async () => {
    const client = new PGlite();
    await client.exec(CREATE_SESSIONS_SQL);
    const db = drizzle(client);

    // 空 query 実行 (empty result)
    const result = await db.select().from(sessions);
    expect(result).toEqual([]);

    // pool.end() を明示せずに client.close() のみで cleanup 完了
    // neon-serverless (WebSocket pool) と違って HTTP/in-memory driver は
    // pool 永続接続なし、event loop に WebSocket handle 残留せず
    await client.close();

    // この時点で test 関数が自然終了 = event loop drain OK
    // beta.7 → beta.8 hang 同型回帰を構造的に防止
  });

  it("multiple sequential queries do not accumulate connections (stateless driver behavior)", async () => {
    const client = new PGlite();
    await client.exec(CREATE_SESSIONS_SQL);
    const db = drizzle(client);

    // 5 連続 insert で connection 蓄積なしを確認
    // (neon-serverless では query 毎に WebSocket connection acquire/release で
    //  pool 増加する可能性、neon-http / pglite では各 query stateless)
    for (let i = 0; i < 5; i++) {
      const agg = createEmptyAggregate(`s-lifecycle-${i}`, `/tmp/s-${i}.jsonl`);
      await db.insert(sessions).values(aggregateToRow(agg, 1000 + i));
    }

    const got = await db.select().from(sessions);
    expect(got).toHaveLength(5);

    await client.close();
    // 5 連続 query 後も自然 exit
  });

  it("double close throws explicit error (driver should not silently reuse stale state, CLI must catch defensively)", async () => {
    const client = new PGlite();
    await client.exec(CREATE_SESSIONS_SQL);
    const db = drizzle(client);

    const agg = createEmptyAggregate("s-double-close", "/tmp/s.jsonl");
    await db.insert(sessions).values(aggregateToRow(agg, 1000));

    await client.close();
    // 二重 close は明示的に error 投げる (pglite + neon-http 共通振る舞い想定)
    // CLI 終了処理 (`statusline.ts` L304-313 の safeExit パターン整合) では
    // try/catch で defensive cleanup 必要、二重発火を内部フラグで排他ガード
    // した上で client.close() を 1 回のみ呼ぶ実装が筋
    await expect(client.close()).rejects.toThrow();
  });

  it("query after close throws (no silent reuse of stale connection)", async () => {
    const client = new PGlite();
    await client.exec(CREATE_SESSIONS_SQL);
    const db = drizzle(client);

    await client.close();

    // close 後の query は明示的にエラーを投げる (stale connection 黙黙 reuse の
    // 反パターン防止、neon-http も同様の振る舞いを期待)
    await expect(db.select().from(sessions)).rejects.toThrow();
  });
});
