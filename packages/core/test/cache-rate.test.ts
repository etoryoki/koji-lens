import { describe, expect, it } from "vitest";
import type { SessionAggregate } from "../src/aggregate.js";
import { computeCacheRate } from "../src/cache-rate.js";

function makeAgg(
  partial: Partial<SessionAggregate> & { sessionId: string },
): SessionAggregate {
  return {
    sessionId: partial.sessionId,
    filePath: partial.filePath ?? `/fake/${partial.sessionId}.jsonl`,
    startedAt: partial.startedAt ?? "2026-04-01T00:00:00.000Z",
    endedAt: partial.endedAt ?? "2026-04-01T01:00:00.000Z",
    durationMs: partial.durationMs ?? 3600000,
    assistantTurns: partial.assistantTurns ?? 10,
    userTurns: partial.userTurns ?? 10,
    sidechainCount: partial.sidechainCount ?? 0,
    models: partial.models ?? { "claude-opus-4-7": 10 },
    inputTokens: partial.inputTokens ?? 1000,
    outputTokens: partial.outputTokens ?? 1000,
    cacheReadTokens: partial.cacheReadTokens ?? 500,
    cacheCreateTokens: partial.cacheCreateTokens ?? 100,
    costUsd: partial.costUsd ?? 1.0,
    costsByModel: partial.costsByModel ?? { "claude-opus-4-7": 1.0 },
    tools: partial.tools ?? { Bash: 5, Read: 3 },
  };
}

describe("computeCacheRate", () => {
  it("returns null for empty aggregates", () => {
    expect(computeCacheRate([])).toBeNull();
  });

  it("returns null when both input and cache read tokens are zero", () => {
    const aggs = [
      makeAgg({ sessionId: "a", inputTokens: 0, cacheReadTokens: 0 }),
    ];
    expect(computeCacheRate(aggs)).toBeNull();
  });

  it("computes cache hit rate as cacheRead / (input + cacheRead)", () => {
    const aggs = [
      makeAgg({ sessionId: "a", inputTokens: 200, cacheReadTokens: 800 }),
    ];
    const result = computeCacheRate(aggs);
    expect(result?.rate).toBeCloseTo(80, 5);
    expect(result?.inputTokens).toBe(200);
    expect(result?.cacheReadTokens).toBe(800);
  });

  it("aggregates across multiple sessions", () => {
    const aggs = [
      makeAgg({ sessionId: "a", inputTokens: 100, cacheReadTokens: 400 }),
      makeAgg({ sessionId: "b", inputTokens: 100, cacheReadTokens: 400 }),
    ];
    const result = computeCacheRate(aggs);
    expect(result?.rate).toBeCloseTo(80, 5);
    expect(result?.inputTokens).toBe(200);
    expect(result?.cacheReadTokens).toBe(800);
  });

  it("returns 0% rate when only input tokens exist (no cache)", () => {
    const aggs = [
      makeAgg({ sessionId: "a", inputTokens: 1000, cacheReadTokens: 0 }),
    ];
    const result = computeCacheRate(aggs);
    expect(result?.rate).toBe(0);
  });

  it("returns 100% rate when only cache reads exist (perfect cache)", () => {
    const aggs = [
      makeAgg({ sessionId: "a", inputTokens: 0, cacheReadTokens: 1000 }),
    ];
    const result = computeCacheRate(aggs);
    expect(result?.rate).toBe(100);
  });
});
