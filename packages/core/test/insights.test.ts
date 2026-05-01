import { describe, expect, it } from "vitest";
import type { CompareResult } from "../src/compare.js";
import { generateInsights } from "../src/insights.js";

function makeResult(partial: {
  beforeSessions?: number;
  afterSessions?: number;
  beforeDays?: number;
  afterDays?: number;
  beforeCost?: number;
  afterCost?: number;
  costByModel?: Record<string, { before: number; after: number; pct: number }>;
  toolsTopChanged?: {
    name: string;
    beforePerSession: number;
    afterPerSession: number;
    pct: number;
  }[];
}): CompareResult {
  const beforeCost = partial.beforeCost ?? 100;
  const afterCost = partial.afterCost ?? 50;
  return {
    before: {
      range: { from: "2026-04-01", to: "2026-04-30" },
      dayCount: partial.beforeDays ?? 30,
      sessionsCount: partial.beforeSessions ?? 10,
      totalCostUsd: beforeCost,
      totalTokens: 1000000,
      costByModel: {},
      toolsCount: {},
    },
    after: {
      range: { from: "2026-05-01", to: "2026-05-30" },
      dayCount: partial.afterDays ?? 30,
      sessionsCount: partial.afterSessions ?? 10,
      totalCostUsd: afterCost,
      totalTokens: 800000,
      costByModel: {},
      toolsCount: {},
    },
    delta: {
      costUsd: afterCost - beforeCost,
      costUsdPct:
        beforeCost > 0 ? ((afterCost - beforeCost) / beforeCost) * 100 : 0,
      sessionsCount: 0,
      sessionsCountPct: 0,
      costByModel: partial.costByModel ?? {},
      toolsTopChanged: partial.toolsTopChanged ?? [],
    },
  };
}

describe("generateInsights", () => {
  it("returns empty array when sessions < 5", () => {
    const result = makeResult({ beforeSessions: 3, afterSessions: 4 });
    expect(generateInsights(result)).toEqual([]);
  });

  it("detects model shift (Opus → Sonnet で 30% 以上削減)", () => {
    const result = makeResult({
      costByModel: {
        "claude-opus-4-7": { before: 100, after: 30, pct: -70 },
      },
    });
    const insights = generateInsights(result);
    expect(insights.some((i) => i.includes("Opus"))).toBe(true);
    expect(insights.some((i) => i.includes("70.0%"))).toBe(true);
  });

  it("does not fire model shift if Opus reduction < 30%", () => {
    const result = makeResult({
      costByModel: {
        "claude-opus-4-7": { before: 100, after: 80, pct: -20 },
      },
    });
    const insights = generateInsights(result);
    expect(insights.some((i) => i.includes("model mix shift"))).toBe(false);
  });

  it("fires net savings projection if both periods >= 14 days", () => {
    const result = makeResult({
      beforeCost: 1000,
      afterCost: 500,
      beforeDays: 30,
      afterDays: 30,
    });
    const insights = generateInsights(result);
    expect(insights.some((i) => i.includes("if continued"))).toBe(true);
    expect(insights.some((i) => i.includes("saved"))).toBe(true);
  });

  it("does not fire projection if periods < 14 days (深町諮問論点 3 ルール 5)", () => {
    const result = makeResult({
      beforeDays: 7,
      afterDays: 7,
    });
    const insights = generateInsights(result);
    expect(insights.some((i) => i.includes("if continued"))).toBe(false);
  });

  it("fires daily average drop (30% 以上削減)", () => {
    const result = makeResult({
      beforeCost: 300, // 10/day
      afterCost: 90, // 3/day
      beforeDays: 30,
      afterDays: 30,
    });
    const insights = generateInsights(result);
    expect(insights.some((i) => i.includes("daily average"))).toBe(true);
  });

  it("fires tool偏り変化 (per-session 50% 超)", () => {
    const result = makeResult({
      toolsTopChanged: [
        { name: "Bash", beforePerSession: 10, afterPerSession: 30, pct: 200 },
      ],
    });
    const insights = generateInsights(result);
    expect(insights.some((i) => i.includes("Bash"))).toBe(true);
  });

  it("respects MAX_INSIGHTS = 3 (深町論点 3 採用)", () => {
    const result = makeResult({
      beforeCost: 1000,
      afterCost: 100,
      beforeDays: 30,
      afterDays: 30,
      costByModel: {
        "claude-opus-4-7": { before: 900, after: 90, pct: -90 },
      },
      toolsTopChanged: [
        {
          name: "Bash",
          beforePerSession: 10,
          afterPerSession: 30,
          pct: 200,
        },
        {
          name: "Read",
          beforePerSession: 5,
          afterPerSession: 25,
          pct: 400,
        },
      ],
    });
    const insights = generateInsights(result);
    expect(insights.length).toBeLessThanOrEqual(3);
  });

  it("is deterministic (no Date.now() / new Date() side effects)", () => {
    const result = makeResult({
      costByModel: {
        "claude-opus-4-7": { before: 100, after: 30, pct: -70 },
      },
    });
    const r1 = generateInsights(result);
    const r2 = generateInsights(result);
    expect(r1).toEqual(r2);
  });
});
