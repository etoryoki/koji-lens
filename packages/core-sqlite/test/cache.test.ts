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
