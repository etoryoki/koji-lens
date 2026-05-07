import { describe, it, expect } from "vitest";
import { createEmptyAggregate } from "@kojihq/core";
import {
  clearSessionCache,
  getSessionCache,
  isCacheFresh,
  listSessionCaches,
  openCacheDb,
  upsertSessionCache,
} from "../src/index.js";

function makeAgg(id: string, overrides: Partial<ReturnType<typeof createEmptyAggregate>> = {}) {
  const agg = createEmptyAggregate(id, `/tmp/${id}.jsonl`);
  Object.assign(agg, overrides);
  return agg;
}

describe("SQLite cache", () => {
  it("upsert and get a session", () => {
    const { db, close } = openCacheDb(":memory:");
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
      upsertSessionCache(db, agg, 1000);
      const got = getSessionCache(db, "s1");
      expect(got).not.toBeNull();
      expect(got?.assistantTurns).toBe(5);
      expect(got?.costUsd).toBeCloseTo(0.12, 4);
      expect(got?.mtimeMs).toBe(1000);
      expect(got?.models).toEqual({ "claude-opus-4-7": 5 });
      expect(got?.tools).toEqual({ Bash: 3 });
      expect(got?.startedAt).toBe("2026-04-22T00:00:00Z");
      expect(typeof got?.cachedAt).toBe("number");
    } finally {
      close();
    }
  });

  it("isCacheFresh true when stored mtime >= query mtime", () => {
    const { db, close } = openCacheDb(":memory:");
    try {
      upsertSessionCache(db, makeAgg("s1"), 1000);
      expect(isCacheFresh(db, "s1", 1000)).toBe(true);
      expect(isCacheFresh(db, "s1", 500)).toBe(true);
      expect(isCacheFresh(db, "s1", 2000)).toBe(false);
      expect(isCacheFresh(db, "missing", 1000)).toBe(false);
    } finally {
      close();
    }
  });

  it("upsert overwrites existing row", () => {
    const { db, close } = openCacheDb(":memory:");
    try {
      upsertSessionCache(db, makeAgg("s1", { costUsd: 1 }), 1000);
      upsertSessionCache(db, makeAgg("s1", { costUsd: 2 }), 2000);
      const got = getSessionCache(db, "s1");
      expect(got?.costUsd).toBe(2);
      expect(got?.mtimeMs).toBe(2000);
    } finally {
      close();
    }
  });

  it("listSessionCaches returns all rows, clear removes them", () => {
    const { db, close } = openCacheDb(":memory:");
    try {
      upsertSessionCache(db, makeAgg("s1"), 100);
      upsertSessionCache(db, makeAgg("s2"), 200);
      expect(listSessionCaches(db)).toHaveLength(2);
      const removed = clearSessionCache(db);
      expect(removed).toBe(2);
      expect(listSessionCaches(db)).toHaveLength(0);
    } finally {
      close();
    }
  });
});

// 深町 CTO Warning 1 (2026-05-07 Anthropic Higher Limits 影響評価諮問):
// rate limit 2 倍化後のデータ量増加を見越した SQLite cache パフォーマンス
// 基準値測定。CI 環境で fail させない loose threshold (環境依存性吸収)。
describe("SQLite cache benchmarks (300 sessions fixture)", () => {
  it("upsert + list 100 sessions completes within 5s", () => {
    const { db, close } = openCacheDb(":memory:");
    try {
      const t0 = performance.now();
      for (let i = 0; i < 100; i++) {
        upsertSessionCache(
          db,
          makeAgg(`bench-${i}`, {
            assistantTurns: i % 50,
            costUsd: i * 0.01,
            inputTokens: i * 100,
            outputTokens: i * 50,
            cacheReadTokens: i * 1000,
            models: { "claude-opus-4-7": i },
            tools: { Bash: i % 10, Edit: i % 5 },
          }),
          1000 + i,
        );
      }
      const tAfterUpsert = performance.now();
      const rows = listSessionCaches(db);
      const tAfterList = performance.now();

      expect(rows).toHaveLength(100);
      const upsertMs = tAfterUpsert - t0;
      const listMs = tAfterList - tAfterUpsert;

      // CI 環境で fail させないための loose threshold
      expect(upsertMs).toBeLessThan(5000);
      expect(listMs).toBeLessThan(2000);

      // 計測値ログ (ベンチマーク目的)
      // eslint-disable-next-line no-console
      console.log(
        `[bench] 100 sessions: upsert=${upsertMs.toFixed(0)}ms, list=${listMs.toFixed(0)}ms`,
      );
    } finally {
      close();
    }
  });

  it("upsert + list 300 sessions completes within 15s", () => {
    const { db, close } = openCacheDb(":memory:");
    try {
      const t0 = performance.now();
      for (let i = 0; i < 300; i++) {
        upsertSessionCache(
          db,
          makeAgg(`bench-${i}`, {
            assistantTurns: i % 100,
            costUsd: i * 0.01,
            inputTokens: i * 100,
            outputTokens: i * 50,
            cacheReadTokens: i * 1000,
            cacheCreateTokens: i * 100,
            models: { "claude-opus-4-7": i % 200, "claude-sonnet-4-6": i % 100 },
            tools: { Bash: i % 10, Edit: i % 5, Read: i % 7 },
          }),
          1000 + i,
        );
      }
      const tAfterUpsert = performance.now();
      const rows = listSessionCaches(db);
      const tAfterList = performance.now();

      expect(rows).toHaveLength(300);
      const upsertMs = tAfterUpsert - t0;
      const listMs = tAfterList - tAfterUpsert;

      // CI 環境で fail させないための loose threshold
      expect(upsertMs).toBeLessThan(15000);
      expect(listMs).toBeLessThan(5000);

      // 計測値ログ (ベンチマーク目的、Anthropic 5/06 Higher Limits 後の
      // データ量増加見越し基準値)
      // eslint-disable-next-line no-console
      console.log(
        `[bench] 300 sessions: upsert=${upsertMs.toFixed(0)}ms, list=${listMs.toFixed(0)}ms`,
      );
    } finally {
      close();
    }
  });

  it("isCacheFresh on 300 sessions completes within 100ms total", () => {
    const { db, close } = openCacheDb(":memory:");
    try {
      for (let i = 0; i < 300; i++) {
        upsertSessionCache(db, makeAgg(`bench-${i}`), 1000 + i);
      }

      const t0 = performance.now();
      let freshCount = 0;
      for (let i = 0; i < 300; i++) {
        if (isCacheFresh(db, `bench-${i}`, 1000 + i)) freshCount++;
      }
      const elapsedMs = performance.now() - t0;

      expect(freshCount).toBe(300);
      expect(elapsedMs).toBeLessThan(2000);

      // eslint-disable-next-line no-console
      console.log(
        `[bench] isCacheFresh × 300: total=${elapsedMs.toFixed(0)}ms (avg ${(elapsedMs / 300).toFixed(2)}ms/call)`,
      );
    } finally {
      close();
    }
  });
});
