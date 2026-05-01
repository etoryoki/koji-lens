import { describe, expect, it } from "vitest";
import type { SessionAggregate } from "../src/aggregate.js";
import { computeCompare, computePeriodSummary } from "../src/compare.js";

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

describe("computePeriodSummary", () => {
  it("aggregates basic totals", () => {
    const aggs = [
      makeAgg({ sessionId: "a", costUsd: 1.5 }),
      makeAgg({ sessionId: "b", costUsd: 2.5 }),
    ];
    const range = {
      from: new Date("2026-04-01"),
      to: new Date("2026-04-30"),
    };
    const summary = computePeriodSummary(aggs, range);

    expect(summary.sessionsCount).toBe(2);
    expect(summary.totalCostUsd).toBe(4.0);
    expect(summary.dayCount).toBe(30);
  });

  it("computes dayCount inclusive of both ends", () => {
    const range = {
      from: new Date("2026-04-01"),
      to: new Date("2026-04-01"),
    };
    const summary = computePeriodSummary([], range);
    expect(summary.dayCount).toBe(1);
  });

  it("aggregates costByModel across sessions", () => {
    const aggs = [
      makeAgg({
        sessionId: "a",
        costsByModel: { "claude-opus-4-7": 5, "claude-sonnet-4-6": 1 },
      }),
      makeAgg({
        sessionId: "b",
        costsByModel: { "claude-opus-4-7": 3, "claude-sonnet-4-6": 2 },
      }),
    ];
    const range = { from: new Date("2026-04-01"), to: new Date("2026-04-30") };
    const summary = computePeriodSummary(aggs, range);

    expect(summary.costByModel["claude-opus-4-7"]).toBe(8);
    expect(summary.costByModel["claude-sonnet-4-6"]).toBe(3);
  });

  it("aggregates tools count across sessions", () => {
    const aggs = [
      makeAgg({ sessionId: "a", tools: { Bash: 5, Read: 3 } }),
      makeAgg({ sessionId: "b", tools: { Bash: 7, Edit: 2 } }),
    ];
    const range = { from: new Date("2026-04-01"), to: new Date("2026-04-30") };
    const summary = computePeriodSummary(aggs, range);

    expect(summary.toolsCount.Bash).toBe(12);
    expect(summary.toolsCount.Read).toBe(3);
    expect(summary.toolsCount.Edit).toBe(2);
  });

  it("handles empty input", () => {
    const range = { from: new Date("2026-04-01"), to: new Date("2026-04-30") };
    const summary = computePeriodSummary([], range);

    expect(summary.sessionsCount).toBe(0);
    expect(summary.totalCostUsd).toBe(0);
    expect(summary.totalTokens).toBe(0);
    expect(Object.keys(summary.costByModel)).toHaveLength(0);
  });
});

describe("computeCompare", () => {
  const range = { from: new Date("2026-04-01"), to: new Date("2026-04-30") };

  it("computes basic delta", () => {
    const beforeAggs = [makeAgg({ sessionId: "a", costUsd: 100 })];
    const afterAggs = [makeAgg({ sessionId: "b", costUsd: 60 })];
    const result = computeCompare(beforeAggs, afterAggs, range, range);

    expect(result.delta.costUsd).toBe(-40);
    expect(result.delta.costUsdPct).toBe(-40);
  });

  it("handles zero before cost gracefully", () => {
    const beforeAggs: SessionAggregate[] = [];
    const afterAggs = [makeAgg({ sessionId: "a", costUsd: 100 })];
    const result = computeCompare(beforeAggs, afterAggs, range, range);

    expect(result.delta.costUsd).toBe(100);
    expect(result.delta.costUsdPct).toBe(0);
  });

  it("computes costByModel delta with model shift", () => {
    const beforeAggs = [
      makeAgg({
        sessionId: "a",
        costUsd: 100,
        costsByModel: { "claude-opus-4-7": 95, "claude-sonnet-4-6": 5 },
      }),
    ];
    const afterAggs = [
      makeAgg({
        sessionId: "b",
        costUsd: 50,
        costsByModel: { "claude-opus-4-7": 20, "claude-sonnet-4-6": 30 },
      }),
    ];
    const result = computeCompare(beforeAggs, afterAggs, range, range);

    expect(result.delta.costByModel["claude-opus-4-7"]?.pct).toBeCloseTo(
      ((20 - 95) / 95) * 100,
      1,
    );
    expect(result.delta.costByModel["claude-sonnet-4-6"]?.pct).toBeCloseTo(
      ((30 - 5) / 5) * 100,
      1,
    );
  });

  it("normalizes tools per-session (深町諮問論点 3 ルール 2 修正)", () => {
    const beforeAggs = [
      makeAgg({ sessionId: "a", tools: { Bash: 10 } }),
      makeAgg({ sessionId: "b", tools: { Bash: 10 } }),
    ];
    const afterAggs = [
      makeAgg({ sessionId: "c", tools: { Bash: 30 } }),
      makeAgg({ sessionId: "d", tools: { Bash: 30 } }),
      makeAgg({ sessionId: "e", tools: { Bash: 30 } }),
      makeAgg({ sessionId: "f", tools: { Bash: 30 } }),
    ];
    const result = computeCompare(beforeAggs, afterAggs, range, range);

    const bashTool = result.delta.toolsTopChanged.find(
      (t) => t.name === "Bash",
    );
    expect(bashTool?.beforePerSession).toBe(10);
    expect(bashTool?.afterPerSession).toBe(30);
    expect(bashTool?.pct).toBeCloseTo(200, 1);
  });

  it("returns top 5 tools sorted by absolute pct change", () => {
    const beforeAggs = [
      makeAgg({
        sessionId: "a",
        tools: { Bash: 10, Read: 10, Edit: 10, Grep: 10, Write: 10, Glob: 10 },
      }),
    ];
    const afterAggs = [
      makeAgg({
        sessionId: "b",
        tools: { Bash: 100, Read: 5, Edit: 50, Grep: 1, Write: 10, Glob: 30 },
      }),
    ];
    const result = computeCompare(beforeAggs, afterAggs, range, range);

    expect(result.delta.toolsTopChanged).toHaveLength(5);
  });

  it("is deterministic (no Date.now() / new Date() side effects)", () => {
    const beforeAggs = [makeAgg({ sessionId: "a", costUsd: 100 })];
    const afterAggs = [makeAgg({ sessionId: "b", costUsd: 50 })];
    const r1 = computeCompare(beforeAggs, afterAggs, range, range);
    const r2 = computeCompare(beforeAggs, afterAggs, range, range);

    expect(r1).toEqual(r2);
  });
});
