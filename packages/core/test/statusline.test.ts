import { describe, expect, it } from "vitest";
import type { SessionAggregate } from "../src/aggregate.js";
import { computeCompare } from "../src/compare.js";
import { computeMonthRanges, renderStatusline } from "../src/statusline.js";

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

const lastMonthRange = {
  from: new Date("2026-04-01T00:00:00.000Z"),
  to: new Date("2026-04-30T23:59:59.999Z"),
};
const thisMonthRange = {
  from: new Date("2026-05-01T00:00:00.000Z"),
  to: new Date("2026-05-15T23:59:59.999Z"),
};

describe("computeMonthRanges", () => {
  it("computes this month start at UTC month boundary", () => {
    const ranges = computeMonthRanges(new Date("2026-05-15T12:00:00.000Z"));
    expect(ranges.thisMonth.from.toISOString()).toBe("2026-05-01T00:00:00.000Z");
    expect(ranges.thisMonth.to.toISOString()).toBe("2026-05-15T12:00:00.000Z");
  });

  it("computes last month as full previous calendar month", () => {
    const ranges = computeMonthRanges(new Date("2026-05-15T12:00:00.000Z"));
    expect(ranges.lastMonth.from.toISOString()).toBe("2026-04-01T00:00:00.000Z");
    expect(ranges.lastMonth.to.toISOString()).toBe("2026-04-30T23:59:59.999Z");
  });

  it("handles January (year boundary)", () => {
    const ranges = computeMonthRanges(new Date("2026-01-10T00:00:00.000Z"));
    expect(ranges.lastMonth.from.toISOString()).toBe("2025-12-01T00:00:00.000Z");
    expect(ranges.lastMonth.to.toISOString()).toBe("2025-12-31T23:59:59.999Z");
  });
});

describe("renderStatusline", () => {
  it("returns no-data marker when both periods empty", () => {
    const result = computeCompare([], [], lastMonthRange, thisMonthRange);
    expect(renderStatusline(result)).toBe("⚪ no data yet");
  });

  it("returns ⚪ new when last month has no data", () => {
    const after = [
      makeAgg({
        sessionId: "a",
        endedAt: "2026-05-05T00:00:00.000Z",
        costUsd: 50,
        costsByModel: { "claude-sonnet-4-6": 50 },
      }),
    ];
    const result = computeCompare([], after, lastMonthRange, thisMonthRange);
    const out = renderStatusline(result);
    expect(out).toContain("⚪ new");
    expect(out).toContain("$50");
    expect(out).toContain("this month");
  });

  it("emits 💚 on track when cost dropped > 10%", () => {
    const before = [
      makeAgg({
        sessionId: "b",
        endedAt: "2026-04-15T00:00:00.000Z",
        costUsd: 100,
        costsByModel: { "claude-opus-4-7": 100 },
      }),
    ];
    const after = [
      makeAgg({
        sessionId: "a",
        endedAt: "2026-05-10T00:00:00.000Z",
        costUsd: 60,
        costsByModel: { "claude-sonnet-4-6": 60 },
      }),
    ];
    const result = computeCompare(before, after, lastMonthRange, thisMonthRange);
    const out = renderStatusline(result);
    expect(out).toContain("💚 on track");
    expect(out).toContain("📉");
    expect(out).toContain("saved");
  });

  it("emits 🚨 over budget when cost rose > 10%", () => {
    const before = [
      makeAgg({
        sessionId: "b",
        endedAt: "2026-04-15T00:00:00.000Z",
        costUsd: 50,
      }),
    ];
    const after = [
      makeAgg({
        sessionId: "a",
        endedAt: "2026-05-10T00:00:00.000Z",
        costUsd: 100,
      }),
    ];
    const result = computeCompare(before, after, lastMonthRange, thisMonthRange);
    const out = renderStatusline(result);
    expect(out).toContain("🚨 over budget");
    expect(out).toContain("📈");
    expect(out).toContain("over");
  });

  it("emits 💛 watch when within ±10%", () => {
    const before = [
      makeAgg({
        sessionId: "b",
        endedAt: "2026-04-15T00:00:00.000Z",
        costUsd: 100,
      }),
    ];
    const after = [
      makeAgg({
        sessionId: "a",
        endedAt: "2026-05-10T00:00:00.000Z",
        costUsd: 105,
      }),
    ];
    const result = computeCompare(before, after, lastMonthRange, thisMonthRange);
    expect(renderStatusline(result)).toContain("💛 watch");
  });

  it("includes Sonnet shift annotation when ratio shifts ≥ 5pt", () => {
    const before = [
      makeAgg({
        sessionId: "b",
        endedAt: "2026-04-15T00:00:00.000Z",
        costUsd: 100,
        costsByModel: { "claude-opus-4-7": 92, "claude-sonnet-4-6": 8 },
      }),
    ];
    const after = [
      makeAgg({
        sessionId: "a",
        endedAt: "2026-05-10T00:00:00.000Z",
        costUsd: 60,
        costsByModel: { "claude-opus-4-7": 24, "claude-sonnet-4-6": 36 },
      }),
    ];
    const result = computeCompare(before, after, lastMonthRange, thisMonthRange);
    const out = renderStatusline(result);
    expect(out).toContain("Sonnet 60%");
    expect(out).toContain("was 8%");
  });

  it("omits Sonnet annotation when ratio shift < 5pt", () => {
    const before = [
      makeAgg({
        sessionId: "b",
        endedAt: "2026-04-15T00:00:00.000Z",
        costUsd: 100,
        costsByModel: { "claude-opus-4-7": 50, "claude-sonnet-4-6": 50 },
      }),
    ];
    const after = [
      makeAgg({
        sessionId: "a",
        endedAt: "2026-05-10T00:00:00.000Z",
        costUsd: 80,
        costsByModel: { "claude-opus-4-7": 40, "claude-sonnet-4-6": 40 },
      }),
    ];
    const result = computeCompare(before, after, lastMonthRange, thisMonthRange);
    const out = renderStatusline(result);
    expect(out).not.toContain("Sonnet");
    expect(out).not.toContain("was");
  });
});
