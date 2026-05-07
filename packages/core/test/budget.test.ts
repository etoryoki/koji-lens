import { describe, expect, it } from "vitest";
import {
  checkBudgetAlert,
  computeBudgetForecast,
} from "../src/budget.js";
import type { SessionAggregate } from "../src/aggregate.js";

function makeAgg(
  partial: Partial<SessionAggregate> & { sessionId: string },
): SessionAggregate {
  return {
    sessionId: partial.sessionId,
    filePath: partial.filePath ?? `/fake/${partial.sessionId}.jsonl`,
    startedAt: partial.startedAt ?? "2026-05-01T00:00:00.000Z",
    endedAt: partial.endedAt ?? "2026-05-01T01:00:00.000Z",
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

describe("computeBudgetForecast", () => {
  it("computes month-to-date and forecast linearly", () => {
    const now = new Date("2026-05-10T12:00:00.000Z"); // Day 10 of May (31 days)
    const aggs: SessionAggregate[] = [
      makeAgg({
        sessionId: "a",
        endedAt: "2026-05-01T01:00:00.000Z",
        costUsd: 5,
      }),
      makeAgg({
        sessionId: "b",
        endedAt: "2026-05-05T01:00:00.000Z",
        costUsd: 10,
      }),
      makeAgg({
        sessionId: "c",
        endedAt: "2026-05-09T01:00:00.000Z",
        costUsd: 5,
      }),
    ];
    const f = computeBudgetForecast(aggs, 100, now);
    expect(f.currentCostUsd).toBe(20);
    expect(f.daysElapsed).toBe(10);
    expect(f.daysInMonth).toBe(31);
    expect(f.utilizationPct).toBe(20);
    // dailyAvg = 20 / 10 = 2, forecast = 2 * 31 = 62
    expect(f.forecastCostUsd).toBeCloseTo(62, 4);
    expect(f.forecastUtilizationPct).toBeCloseTo(62, 4);
  });

  it("excludes prior-month sessions from current month cost", () => {
    const now = new Date("2026-05-10T12:00:00.000Z");
    const aggs: SessionAggregate[] = [
      makeAgg({
        sessionId: "old",
        endedAt: "2026-04-30T23:00:00.000Z",
        costUsd: 100,
      }),
      makeAgg({
        sessionId: "new",
        endedAt: "2026-05-05T01:00:00.000Z",
        costUsd: 10,
      }),
    ];
    const f = computeBudgetForecast(aggs, 100, now);
    expect(f.currentCostUsd).toBe(10);
  });

  it("returns 0% utilization when budget is 0", () => {
    const now = new Date("2026-05-10T12:00:00.000Z");
    const aggs: SessionAggregate[] = [
      makeAgg({
        sessionId: "a",
        endedAt: "2026-05-05T01:00:00.000Z",
        costUsd: 50,
      }),
    ];
    const f = computeBudgetForecast(aggs, 0, now);
    expect(f.utilizationPct).toBe(0);
    expect(f.forecastUtilizationPct).toBe(0);
  });

  it("handles month with 30 days (April)", () => {
    const now = new Date("2026-04-15T12:00:00.000Z");
    const aggs: SessionAggregate[] = [];
    const f = computeBudgetForecast(aggs, 100, now);
    expect(f.daysInMonth).toBe(30);
  });

  it("ignores sessions with invalid timestamps", () => {
    const now = new Date("2026-05-10T12:00:00.000Z");
    const aggs: SessionAggregate[] = [
      {
        ...makeAgg({ sessionId: "bad", costUsd: 100 }),
        startedAt: null,
        endedAt: null,
      },
      makeAgg({
        sessionId: "good",
        endedAt: "2026-05-05T01:00:00.000Z",
        costUsd: 10,
      }),
    ];
    const f = computeBudgetForecast(aggs, 100, now);
    expect(f.currentCostUsd).toBe(10);
  });
});

describe("checkBudgetAlert", () => {
  it("returns null when budget is 0", () => {
    const alert = checkBudgetAlert({
      budgetUsd: 0,
      monthStartIso: "2026-05-01",
      daysElapsed: 10,
      daysInMonth: 31,
      currentCostUsd: 50,
      utilizationPct: 0,
      forecastCostUsd: 155,
      forecastUtilizationPct: 0,
    });
    expect(alert).toBeNull();
  });

  it("critical alert when current cost exceeds budget", () => {
    const alert = checkBudgetAlert({
      budgetUsd: 100,
      monthStartIso: "2026-05-01",
      daysElapsed: 10,
      daysInMonth: 31,
      currentCostUsd: 110,
      utilizationPct: 110,
      forecastCostUsd: 341,
      forecastUtilizationPct: 341,
    });
    expect(alert?.level).toBe("critical");
    expect(alert?.trigger).toBe("current");
  });

  it("critical alert when forecast exceeds budget", () => {
    const alert = checkBudgetAlert({
      budgetUsd: 100,
      monthStartIso: "2026-05-01",
      daysElapsed: 10,
      daysInMonth: 31,
      currentCostUsd: 50,
      utilizationPct: 50,
      forecastCostUsd: 155,
      forecastUtilizationPct: 155,
    });
    expect(alert?.level).toBe("critical");
    expect(alert?.trigger).toBe("forecast");
  });

  it("warning alert when forecast >= 80% but < 100%", () => {
    const alert = checkBudgetAlert({
      budgetUsd: 100,
      monthStartIso: "2026-05-01",
      daysElapsed: 10,
      daysInMonth: 31,
      currentCostUsd: 30,
      utilizationPct: 30,
      forecastCostUsd: 90,
      forecastUtilizationPct: 90,
    });
    expect(alert?.level).toBe("warning");
    expect(alert?.trigger).toBe("forecast");
  });

  it("returns null when forecast is below 80%", () => {
    const alert = checkBudgetAlert({
      budgetUsd: 100,
      monthStartIso: "2026-05-01",
      daysElapsed: 10,
      daysInMonth: 31,
      currentCostUsd: 20,
      utilizationPct: 20,
      forecastCostUsd: 60,
      forecastUtilizationPct: 60,
    });
    expect(alert).toBeNull();
  });
});
