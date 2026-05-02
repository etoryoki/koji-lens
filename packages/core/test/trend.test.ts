import { describe, expect, it } from "vitest";
import type { SessionAggregate } from "../src/aggregate.js";
import {
  computeWeeklyTrend,
  detectTrendRegressions,
} from "../src/trend.js";

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
    cacheReadTokens: partial.cacheReadTokens ?? 9000,
    cacheCreateTokens: partial.cacheCreateTokens ?? 100,
    costUsd: partial.costUsd ?? 1.0,
    costsByModel: partial.costsByModel ?? { "claude-opus-4-7": 1.0 },
    tools: partial.tools ?? { Bash: 5 },
    modelChanges: partial.modelChanges ?? [],
    latencyP50Ms: partial.latencyP50Ms ?? 2000,
    latencyP95Ms: partial.latencyP95Ms ?? 5000,
  };
}

describe("computeWeeklyTrend", () => {
  it("buckets sessions into weeks", () => {
    const now = new Date("2026-05-03T00:00:00.000Z"); // Sunday (UTC)
    const aggs = [
      makeAgg({
        sessionId: "a",
        endedAt: "2026-04-29T10:00:00.000Z",
        costUsd: 5,
      }),
      makeAgg({
        sessionId: "b",
        endedAt: "2026-04-22T10:00:00.000Z",
        costUsd: 3,
      }),
    ];
    const result = computeWeeklyTrend(aggs, 4, now);
    expect(result.weeks).toHaveLength(4);
    const total = result.weeks.reduce((s, w) => s + w.totalCostUsd, 0);
    expect(total).toBeCloseTo(8, 4);
  });

  it("computes cache hit rate correctly", () => {
    const now = new Date("2026-05-03T00:00:00.000Z");
    const aggs = [
      makeAgg({
        sessionId: "a",
        endedAt: "2026-04-29T10:00:00.000Z",
        inputTokens: 100,
        cacheReadTokens: 900,
      }),
    ];
    const result = computeWeeklyTrend(aggs, 4, now);
    const targetWeek = result.weeks.find((w) => w.sessionsCount > 0);
    expect(targetWeek?.cacheHitRatePct).toBeCloseTo(90, 1);
  });

  it("counts model changes across weeks", () => {
    const now = new Date("2026-05-03T00:00:00.000Z");
    const aggs = [
      makeAgg({
        sessionId: "a",
        endedAt: "2026-04-29T10:00:00.000Z",
        modelChanges: [
          { fromModel: "opus", toModel: "sonnet", at: "2026-04-29T10:00:00Z" },
          { fromModel: "sonnet", toModel: "opus", at: "2026-04-29T10:30:00Z" },
        ],
      }),
    ];
    const result = computeWeeklyTrend(aggs, 4, now);
    const target = result.weeks.find((w) => w.modelChangesCount > 0);
    expect(target?.modelChangesCount).toBe(2);
  });
});

describe("detectTrendRegressions", () => {
  it("detects critical cache drop (> 50%)", () => {
    const result = {
      weeks: [
        {
          weekStartIso: "2026-04-06",
          weekEndIso: "2026-04-12",
          sessionsCount: 10,
          totalCostUsd: 100,
          totalInputTokens: 0,
          totalCacheReadTokens: 0,
          cacheHitRatePct: 90,
          latencyP50Ms: 2000,
          latencyP95Ms: 5000,
          modelChangesCount: 0,
          costByModel: {},
        },
        {
          weekStartIso: "2026-04-13",
          weekEndIso: "2026-04-19",
          sessionsCount: 10,
          totalCostUsd: 100,
          totalInputTokens: 0,
          totalCacheReadTokens: 0,
          cacheHitRatePct: 88,
          latencyP50Ms: 2000,
          latencyP95Ms: 5000,
          modelChangesCount: 0,
          costByModel: {},
        },
        {
          weekStartIso: "2026-04-20",
          weekEndIso: "2026-04-26",
          sessionsCount: 10,
          totalCostUsd: 100,
          totalInputTokens: 0,
          totalCacheReadTokens: 0,
          cacheHitRatePct: 30, // crash
          latencyP50Ms: 2000,
          latencyP95Ms: 5000,
          modelChangesCount: 0,
          costByModel: {},
        },
      ],
    };
    const regs = detectTrendRegressions(result);
    expect(regs.some((r) => r.type === "cache_drop" && r.severity === "critical")).toBe(true);
  });

  it("detects critical latency spike (>= 2x)", () => {
    const result = {
      weeks: [
        {
          weekStartIso: "2026-04-06",
          weekEndIso: "2026-04-12",
          sessionsCount: 10,
          totalCostUsd: 100,
          totalInputTokens: 0,
          totalCacheReadTokens: 0,
          cacheHitRatePct: 90,
          latencyP50Ms: 2000,
          latencyP95Ms: 5000,
          modelChangesCount: 0,
          costByModel: {},
        },
        {
          weekStartIso: "2026-04-13",
          weekEndIso: "2026-04-19",
          sessionsCount: 10,
          totalCostUsd: 100,
          totalInputTokens: 0,
          totalCacheReadTokens: 0,
          cacheHitRatePct: 90,
          latencyP50Ms: 2000,
          latencyP95Ms: 5000,
          modelChangesCount: 0,
          costByModel: {},
        },
        {
          weekStartIso: "2026-04-20",
          weekEndIso: "2026-04-26",
          sessionsCount: 10,
          totalCostUsd: 100,
          totalInputTokens: 0,
          totalCacheReadTokens: 0,
          cacheHitRatePct: 90,
          latencyP50Ms: 2000,
          latencyP95Ms: 15000, // 3x
          modelChangesCount: 0,
          costByModel: {},
        },
      ],
    };
    const regs = detectTrendRegressions(result);
    expect(regs.some((r) => r.type === "latency_spike" && r.severity === "critical")).toBe(true);
  });

  it("detects model change spike (vendor-side default shift)", () => {
    const result = {
      weeks: [
        {
          weekStartIso: "2026-04-06",
          weekEndIso: "2026-04-12",
          sessionsCount: 10,
          totalCostUsd: 100,
          totalInputTokens: 0,
          totalCacheReadTokens: 0,
          cacheHitRatePct: 90,
          latencyP50Ms: 2000,
          latencyP95Ms: 5000,
          modelChangesCount: 1,
          costByModel: {},
        },
        {
          weekStartIso: "2026-04-13",
          weekEndIso: "2026-04-19",
          sessionsCount: 10,
          totalCostUsd: 100,
          totalInputTokens: 0,
          totalCacheReadTokens: 0,
          cacheHitRatePct: 90,
          latencyP50Ms: 2000,
          latencyP95Ms: 5000,
          modelChangesCount: 1,
          costByModel: {},
        },
        {
          weekStartIso: "2026-04-20",
          weekEndIso: "2026-04-26",
          sessionsCount: 10,
          totalCostUsd: 100,
          totalInputTokens: 0,
          totalCacheReadTokens: 0,
          cacheHitRatePct: 90,
          latencyP50Ms: 2000,
          latencyP95Ms: 5000,
          modelChangesCount: 20, // spike
          costByModel: {},
        },
      ],
    };
    const regs = detectTrendRegressions(result);
    expect(regs.some((r) => r.type === "model_change_spike")).toBe(true);
  });

  it("returns empty array with insufficient data", () => {
    expect(detectTrendRegressions({ weeks: [] })).toEqual([]);
    expect(
      detectTrendRegressions({
        weeks: [
          {
            weekStartIso: "2026-04-06",
            weekEndIso: "2026-04-12",
            sessionsCount: 10,
            totalCostUsd: 100,
            totalInputTokens: 0,
            totalCacheReadTokens: 0,
            cacheHitRatePct: 90,
            latencyP50Ms: 2000,
            latencyP95Ms: 5000,
            modelChangesCount: 0,
            costByModel: {},
          },
        ],
      }),
    ).toEqual([]);
  });
});
