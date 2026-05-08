import { describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import { createEmptyAggregate } from "@kojihq/core";
import {
  aggregateToRow,
  rowToCachedAggregate,
  sessions,
  type SessionRow,
} from "../src/index.js";

// 設計 v0.2 §2.6 + 深町 CTO 諮問 (2026-05-08 Phase A 着手前確認 v0.2 論点 1):
// pglite roundtrip test で SQLite ↔ Postgres ランタイム互換性を検証。
// 5/14 Phase A 着手前の Critical 検出リスク事前解消が目的。
// 検証点:
//   1. drizzle-orm の pglite アダプタと @electric-sql/pglite のバージョン互換
//   2. real("cost_usd") の number / string 型マッピング (PG float4 → JS)
//   3. text JSON 文字列化の roundtrip 整合 (modelsJson / toolsJson 等)
//   4. aggregateToRow + rowToCachedAggregate の対称性

// schema.ts と整合: mtime_ms / cached_at は BIGINT (Date.now() 13 桁の overflow 回避)
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

async function setupDb() {
  const client = new PGlite();
  await client.exec(CREATE_SESSIONS_SQL);
  const db = drizzle(client);
  return { db, client };
}

function makeAgg(id: string, overrides: Partial<ReturnType<typeof createEmptyAggregate>> = {}) {
  const agg = createEmptyAggregate(id, `/tmp/${id}.jsonl`);
  Object.assign(agg, overrides);
  return agg;
}

describe("Postgres (pglite) roundtrip", () => {
  it("inserts and selects a session via drizzle", async () => {
    const { db, client } = await setupDb();
    try {
      const agg = makeAgg("s1", {
        assistantTurns: 5,
        costUsd: 0.12,
        models: { "claude-opus-4-7": 5 },
        tools: { Bash: 3 },
        startedAt: "2026-04-22T00:00:00Z",
        endedAt: "2026-04-22T00:10:00Z",
        durationMs: 600_000,
      });
      const row = aggregateToRow(agg, 1000, 12345);

      await db.insert(sessions).values(row);

      const got = await db
        .select()
        .from(sessions)
        .where(eq(sessions.sessionId, "s1"));

      expect(got).toHaveLength(1);
      const cached = rowToCachedAggregate(got[0]);
      expect(cached.assistantTurns).toBe(5);
      expect(cached.costUsd).toBeCloseTo(0.12, 4);
      expect(cached.mtimeMs).toBe(1000);
      expect(cached.cachedAt).toBe(12345);
      expect(cached.models).toEqual({ "claude-opus-4-7": 5 });
      expect(cached.tools).toEqual({ Bash: 3 });
      expect(cached.startedAt).toBe("2026-04-22T00:00:00Z");
    } finally {
      await client.close();
    }
  });

  // 深町 CTO 5/08 諮問 検出パターン 2 検証:
  // real("cost_usd") が pglite 経由で number で返るか、string で返るか
  it("preserves cost_usd as number after roundtrip", async () => {
    const { db, client } = await setupDb();
    try {
      const agg = makeAgg("s-cost", { costUsd: 12.34567 });
      const row = aggregateToRow(agg, 2000);
      await db.insert(sessions).values(row);

      const got = await db
        .select()
        .from(sessions)
        .where(eq(sessions.sessionId, "s-cost"));

      expect(got).toHaveLength(1);
      const r = got[0] as SessionRow;
      expect(typeof r.costUsd).toBe("number");
      expect(r.costUsd).toBeCloseTo(12.34567, 4);
    } finally {
      await client.close();
    }
  });

  it("roundtrips JSON text fields without loss", async () => {
    const { db, client } = await setupDb();
    try {
      const agg = makeAgg("s-json", {
        models: { "claude-opus-4-7": 100, "claude-sonnet-4-6": 50 },
        tools: { Bash: 20, Edit: 10, Read: 5 },
        costsByModel: { "claude-opus-4-7": 9.5, "claude-sonnet-4-6": 0.75 },
        modelChanges: [
          { fromModel: "claude-opus-4-7", toModel: "claude-sonnet-4-6", at: "2026-04-22T01:00:00Z" },
        ],
      });
      await db.insert(sessions).values(aggregateToRow(agg, 3000));

      const got = await db
        .select()
        .from(sessions)
        .where(eq(sessions.sessionId, "s-json"));

      const cached = rowToCachedAggregate(got[0]);
      expect(cached.models).toEqual({ "claude-opus-4-7": 100, "claude-sonnet-4-6": 50 });
      expect(cached.tools).toEqual({ Bash: 20, Edit: 10, Read: 5 });
      expect(cached.costsByModel).toEqual({ "claude-opus-4-7": 9.5, "claude-sonnet-4-6": 0.75 });
      expect(cached.modelChanges).toHaveLength(1);
      expect(cached.modelChanges[0].fromModel).toBe("claude-opus-4-7");
    } finally {
      await client.close();
    }
  });

  it("aggregateToRow and rowToCachedAggregate are symmetric", async () => {
    const { db, client } = await setupDb();
    try {
      const original = makeAgg("s-sym", {
        assistantTurns: 7,
        userTurns: 7,
        sidechainCount: 2,
        inputTokens: 1500,
        outputTokens: 800,
        cacheReadTokens: 5000,
        cacheCreateTokens: 1000,
        costUsd: 0.456,
        models: { "claude-opus-4-7": 7 },
        tools: { Bash: 4, Edit: 3 },
        latencyP50Ms: 800,
        latencyP95Ms: 2400,
        durationMs: 900_000,
        startedAt: "2026-04-22T02:00:00Z",
        endedAt: "2026-04-22T02:15:00Z",
      });
      await db.insert(sessions).values(aggregateToRow(original, 4000, 5000));

      const got = await db
        .select()
        .from(sessions)
        .where(eq(sessions.sessionId, "s-sym"));
      const cached = rowToCachedAggregate(got[0]);

      // SessionAggregate フィールドが original と完全一致 (mtimeMs, cachedAt 以外)
      expect(cached.sessionId).toBe(original.sessionId);
      expect(cached.filePath).toBe(original.filePath);
      expect(cached.assistantTurns).toBe(original.assistantTurns);
      expect(cached.userTurns).toBe(original.userTurns);
      expect(cached.sidechainCount).toBe(original.sidechainCount);
      expect(cached.inputTokens).toBe(original.inputTokens);
      expect(cached.outputTokens).toBe(original.outputTokens);
      expect(cached.cacheReadTokens).toBe(original.cacheReadTokens);
      expect(cached.cacheCreateTokens).toBe(original.cacheCreateTokens);
      expect(cached.costUsd).toBeCloseTo(original.costUsd, 4);
      expect(cached.models).toEqual(original.models);
      expect(cached.tools).toEqual(original.tools);
      expect(cached.latencyP50Ms).toBe(original.latencyP50Ms);
      expect(cached.latencyP95Ms).toBe(original.latencyP95Ms);
      expect(cached.durationMs).toBe(original.durationMs);
      expect(cached.startedAt).toBe(original.startedAt);
      expect(cached.endedAt).toBe(original.endedAt);
    } finally {
      await client.close();
    }
  });

  it("supports upsert via onConflictDoUpdate (PG INSERT ... ON CONFLICT)", async () => {
    const { db, client } = await setupDb();
    try {
      const agg1 = makeAgg("s-up", { costUsd: 1 });
      await db.insert(sessions).values(aggregateToRow(agg1, 1000));

      const agg2 = makeAgg("s-up", { costUsd: 2 });
      await db
        .insert(sessions)
        .values(aggregateToRow(agg2, 2000))
        .onConflictDoUpdate({
          target: sessions.sessionId,
          set: aggregateToRow(agg2, 2000),
        });

      const got = await db
        .select()
        .from(sessions)
        .where(eq(sessions.sessionId, "s-up"));
      expect(got).toHaveLength(1);
      const cached = rowToCachedAggregate(got[0]);
      expect(cached.costUsd).toBeCloseTo(2, 4);
      expect(cached.mtimeMs).toBe(2000);
    } finally {
      await client.close();
    }
  });
});
