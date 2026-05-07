import { describe, expect, it } from "vitest";
import {
  analyzeUserPatternChange,
  attributeRegression,
  detectTrendRegressionsWithAttribution,
} from "../src/attribution.js";
import { computeWeeklyTrend, type WeeklyTrendBucket } from "../src/trend.js";
import type { SessionAggregate } from "../src/aggregate.js";

function makeBucket(
  partial: Partial<WeeklyTrendBucket> & { weekStartIso: string },
): WeeklyTrendBucket {
  return {
    weekStartIso: partial.weekStartIso,
    weekEndIso: partial.weekEndIso ?? partial.weekStartIso,
    sessionsCount: partial.sessionsCount ?? 10,
    totalCostUsd: partial.totalCostUsd ?? 0,
    totalInputTokens: partial.totalInputTokens ?? 0,
    totalCacheReadTokens: partial.totalCacheReadTokens ?? 0,
    cacheHitRatePct: partial.cacheHitRatePct ?? 0,
    latencyP50Ms: partial.latencyP50Ms ?? 0,
    latencyP95Ms: partial.latencyP95Ms ?? 0,
    modelChangesCount: partial.modelChangesCount ?? 0,
    costByModel: partial.costByModel ?? {},
    uniqueDirs: partial.uniqueDirs ?? [],
    uniqueModels: partial.uniqueModels ?? [],
    uniqueTools: partial.uniqueTools ?? [],
  };
}

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

describe("analyzeUserPatternChange", () => {
  it("detects no change when latest matches history", () => {
    const history = [
      makeBucket({
        weekStartIso: "2026-04-13",
        sessionsCount: 10,
        uniqueDirs: ["projA", "projB"],
        uniqueModels: ["opus"],
        uniqueTools: ["Bash"],
      }),
      makeBucket({
        weekStartIso: "2026-04-20",
        sessionsCount: 12,
        uniqueDirs: ["projA"],
        uniqueModels: ["opus"],
        uniqueTools: ["Bash"],
      }),
    ];
    const latest = makeBucket({
      weekStartIso: "2026-04-27",
      sessionsCount: 11,
      uniqueDirs: ["projA"],
      uniqueModels: ["opus"],
      uniqueTools: ["Bash"],
    });

    const change = analyzeUserPatternChange(latest, history);
    expect(change.dirChange).toBe(0);
    expect(change.modelChange).toBe(0);
    expect(change.toolChange).toBe(0);
    expect(Math.abs(change.sessionCountChangePct)).toBeLessThan(20);
  });

  it("detects new dirs / models / tools", () => {
    const history = [
      makeBucket({
        weekStartIso: "2026-04-20",
        sessionsCount: 10,
        uniqueDirs: ["projA"],
        uniqueModels: ["sonnet"],
        uniqueTools: ["Bash"],
      }),
    ];
    const latest = makeBucket({
      weekStartIso: "2026-04-27",
      sessionsCount: 10,
      uniqueDirs: ["projA", "projB", "projC"],
      uniqueModels: ["sonnet", "opus"],
      uniqueTools: ["Bash", "Edit"],
    });

    const change = analyzeUserPatternChange(latest, history);
    expect(change.dirChange).toBe(2);
    expect(change.newDirs).toEqual(["projB", "projC"]);
    expect(change.modelChange).toBe(1);
    expect(change.newModels).toEqual(["opus"]);
    expect(change.toolChange).toBe(1);
    expect(change.newTools).toEqual(["Edit"]);
  });

  it("detects session count change pct", () => {
    const history = [
      makeBucket({ weekStartIso: "2026-04-20", sessionsCount: 10 }),
    ];
    const latest = makeBucket({ weekStartIso: "2026-04-27", sessionsCount: 15 });

    const change = analyzeUserPatternChange(latest, history);
    expect(change.sessionCountChangePct).toBeCloseTo(50, 1);
  });

  it("returns 0 sessionCountChangePct when no history sessions", () => {
    const history: WeeklyTrendBucket[] = [];
    const latest = makeBucket({ weekStartIso: "2026-04-27", sessionsCount: 15 });

    const change = analyzeUserPatternChange(latest, history);
    expect(change.sessionCountChangePct).toBe(0);
  });

  it("caps newDirs / newModels / newTools at 5 entries", () => {
    const history: WeeklyTrendBucket[] = [];
    const latest = makeBucket({
      weekStartIso: "2026-04-27",
      uniqueDirs: ["d1", "d2", "d3", "d4", "d5", "d6", "d7"],
    });

    const change = analyzeUserPatternChange(latest, history);
    expect(change.dirChange).toBe(7);
    expect(change.newDirs).toHaveLength(5);
  });
});

describe("attributeRegression", () => {
  it("verdict = vendor_likely when no axes change", () => {
    const att = attributeRegression({
      dirChange: 0,
      modelChange: 0,
      toolChange: 0,
      sessionCountChangePct: 5,
      newDirs: [],
      newModels: [],
      newTools: [],
    });
    expect(att.verdict).toBe("vendor_likely");
    expect(att.reasoning).toContain("no user pattern changes");
  });

  it("verdict = user_likely when 3+ axes change", () => {
    const att = attributeRegression({
      dirChange: 2,
      modelChange: 1,
      toolChange: 1,
      sessionCountChangePct: 5,
      newDirs: ["a", "b"],
      newModels: ["m"],
      newTools: ["t"],
    });
    expect(att.verdict).toBe("user_likely");
    expect(att.reasoning).toContain("2 new dirs");
    expect(att.reasoning).toContain("1 new model");
    expect(att.reasoning).toContain("1 new tool");
  });

  it("verdict = user_likely when 4 axes change including session count", () => {
    const att = attributeRegression({
      dirChange: 1,
      modelChange: 1,
      toolChange: 1,
      sessionCountChangePct: 50,
      newDirs: ["a"],
      newModels: ["m"],
      newTools: ["t"],
    });
    expect(att.verdict).toBe("user_likely");
    expect(att.reasoning).toContain("+50% session count");
  });

  it("verdict = ambiguous when 1-2 axes change", () => {
    const att = attributeRegression({
      dirChange: 1,
      modelChange: 0,
      toolChange: 0,
      sessionCountChangePct: 10,
      newDirs: ["a"],
      newModels: [],
      newTools: [],
    });
    expect(att.verdict).toBe("ambiguous");
    expect(att.reasoning).toContain("1 of 4");

    const att2 = attributeRegression({
      dirChange: 0,
      modelChange: 1,
      toolChange: 0,
      sessionCountChangePct: 25,
      newDirs: [],
      newModels: ["m"],
      newTools: [],
    });
    expect(att2.verdict).toBe("ambiguous");
    expect(att2.reasoning).toContain("2 of 4");
  });

  it("session count change below 20% does not count as axis change", () => {
    const att = attributeRegression({
      dirChange: 0,
      modelChange: 0,
      toolChange: 0,
      sessionCountChangePct: 19,
      newDirs: [],
      newModels: [],
      newTools: [],
    });
    expect(att.verdict).toBe("vendor_likely");
  });

  it("negative session count change above 20% counts as axis change", () => {
    const att = attributeRegression({
      dirChange: 1,
      modelChange: 1,
      toolChange: 0,
      sessionCountChangePct: -30,
      newDirs: ["a"],
      newModels: ["m"],
      newTools: [],
    });
    expect(att.verdict).toBe("user_likely");
    expect(att.reasoning).toContain("-30% session count");
  });
});

describe("detectTrendRegressionsWithAttribution", () => {
  it("returns regressions without attribution when enableAttribution is false", () => {
    const now = new Date("2026-05-03T00:00:00.000Z");
    const aggs: SessionAggregate[] = [
      makeAgg({
        sessionId: "a",
        endedAt: "2026-04-29T10:00:00.000Z",
        cacheReadTokens: 100,
        inputTokens: 1000,
      }),
      makeAgg({
        sessionId: "b",
        endedAt: "2026-04-22T10:00:00.000Z",
        cacheReadTokens: 9000,
        inputTokens: 1000,
      }),
    ];
    const result = computeWeeklyTrend(aggs, 4, now);
    const regs = detectTrendRegressionsWithAttribution(result);
    for (const r of regs) {
      expect(r.attribution).toBeUndefined();
    }
  });

  it("attaches attribution when enableAttribution=true and regression detected", () => {
    const now = new Date("2026-05-03T00:00:00.000Z");
    const aggs: SessionAggregate[] = [
      makeAgg({
        sessionId: "old",
        endedAt: "2026-04-22T10:00:00.000Z",
        filePath: "/c/projects/projA/old.jsonl",
        cacheReadTokens: 9000,
        inputTokens: 1000,
      }),
      makeAgg({
        sessionId: "new",
        endedAt: "2026-04-29T10:00:00.000Z",
        filePath: "/c/projects/projA/new.jsonl",
        cacheReadTokens: 100,
        inputTokens: 1000,
      }),
    ];
    const result = computeWeeklyTrend(aggs, 4, now);
    const regs = detectTrendRegressionsWithAttribution(result, {
      enableAttribution: true,
    });
    if (regs.length > 0) {
      expect(regs[0].attribution).toBeDefined();
      expect(regs[0].attribution?.verdict).toBeDefined();
    }
  });
});
