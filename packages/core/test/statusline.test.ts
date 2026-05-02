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
    expect(renderStatusline(result)).toBe("⚪ no data");
  });

  it("returns ⚪ new when last month has no data", () => {
    const after = [
      makeAgg({
        sessionId: "a",
        endedAt: "2026-05-05T00:00:00.000Z",
        costUsd: 50,
      }),
    ];
    const result = computeCompare([], after, lastMonthRange, thisMonthRange);
    expect(renderStatusline(result)).toBe("⚪ new");
  });

  it("emits 💚 + negative pct when cost dropped > 10%", () => {
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
        costUsd: 60,
      }),
    ];
    const result = computeCompare(before, after, lastMonthRange, thisMonthRange);
    expect(renderStatusline(result)).toBe("💚 -40%");
  });

  it("emits 🚨 + positive pct when cost rose > 10%", () => {
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
    expect(renderStatusline(result)).toBe("🚨 +100%");
  });

  it("emits 💛 + small pct when within ±10%", () => {
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
    expect(renderStatusline(result)).toBe("💛 +5%");
  });

  it("renders 0% without sign when delta is exactly zero", () => {
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
        costUsd: 100,
      }),
    ];
    const result = computeCompare(before, after, lastMonthRange, thisMonthRange);
    expect(renderStatusline(result)).toBe("💛 0%");
  });
});

describe("renderStatusline modes", () => {
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
      costUsd: 60,
    }),
  ];

  it("minimal mode strips percent and text, leaving icon only", () => {
    const result = computeCompare(before, after, lastMonthRange, thisMonthRange);
    expect(renderStatusline(result, "minimal")).toBe("💚");
  });

  it("normal mode (default) renders icon + percent", () => {
    const result = computeCompare(before, after, lastMonthRange, thisMonthRange);
    expect(renderStatusline(result, "normal")).toBe("💚 -40%");
  });

  it("detailed mode adds comparison label and absolute saved amount", () => {
    const result = computeCompare(before, after, lastMonthRange, thisMonthRange);
    expect(renderStatusline(result, "detailed")).toBe(
      "💚 -40% vs last month | $40 saved",
    );
  });

  it("detailed mode flips wording for cost increase", () => {
    const beforeLow = [
      makeAgg({
        sessionId: "b",
        endedAt: "2026-04-15T00:00:00.000Z",
        costUsd: 50,
      }),
    ];
    const afterHigh = [
      makeAgg({
        sessionId: "a",
        endedAt: "2026-05-10T00:00:00.000Z",
        costUsd: 80,
      }),
    ];
    const result = computeCompare(beforeLow, afterHigh, lastMonthRange, thisMonthRange);
    expect(renderStatusline(result, "detailed")).toBe(
      "🚨 +60% vs last month | $30 over",
    );
  });

  it("minimal mode collapses no-data message to icon", () => {
    const result = computeCompare([], [], lastMonthRange, thisMonthRange);
    expect(renderStatusline(result, "minimal")).toBe("⚪");
  });

  it("minimal mode collapses ⚪ new to icon", () => {
    const result = computeCompare([], after, lastMonthRange, thisMonthRange);
    expect(renderStatusline(result, "minimal")).toBe("⚪");
  });
});

describe("renderStatusline state icon integration", () => {
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
      costUsd: 60,
    }),
  ];

  it("prepends state icon to minimal mode", () => {
    const result = computeCompare(before, after, lastMonthRange, thisMonthRange);
    expect(renderStatusline(result, "minimal", { stateIcon: "⚡" })).toBe(
      "⚡ 💚",
    );
  });

  it("prepends state icon to normal mode", () => {
    const result = computeCompare(before, after, lastMonthRange, thisMonthRange);
    expect(renderStatusline(result, "normal", { stateIcon: "💤" })).toBe(
      "💤 💚 -40%",
    );
  });

  it("prepends state icon to detailed mode", () => {
    const result = computeCompare(before, after, lastMonthRange, thisMonthRange);
    expect(renderStatusline(result, "detailed", { stateIcon: "🛑" })).toBe(
      "🛑 💚 -40% vs last month | $40 saved",
    );
  });

  it("omits state icon when null (no state file or stale)", () => {
    const result = computeCompare(before, after, lastMonthRange, thisMonthRange);
    expect(renderStatusline(result, "normal", { stateIcon: null })).toBe(
      "💚 -40%",
    );
    expect(renderStatusline(result, "normal")).toBe("💚 -40%");
  });
});

describe("renderStatusline cache rate integration", () => {
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
      costUsd: 60,
    }),
  ];
  const cacheRate = {
    rate: 78.4,
    inputTokens: 200,
    cacheReadTokens: 800,
  };

  it("appends 💎 (no number) to minimal mode", () => {
    const result = computeCompare(before, after, lastMonthRange, thisMonthRange);
    expect(renderStatusline(result, "minimal", { cacheRate })).toBe(
      "💚 💎",
    );
  });

  it("appends 💎 + percent to normal mode", () => {
    const result = computeCompare(before, after, lastMonthRange, thisMonthRange);
    expect(renderStatusline(result, "normal", { cacheRate })).toBe(
      "💚 -40% 💎 78%",
    );
  });

  it("appends 💎 + percent + label with pipe to detailed mode", () => {
    const result = computeCompare(before, after, lastMonthRange, thisMonthRange);
    expect(renderStatusline(result, "detailed", { cacheRate })).toBe(
      "💚 -40% vs last month | $40 saved | 💎 78% cache",
    );
  });

  it("places state icon leftmost when both state and cache rate present", () => {
    const result = computeCompare(before, after, lastMonthRange, thisMonthRange);
    expect(
      renderStatusline(result, "normal", { stateIcon: "⚡", cacheRate }),
    ).toBe("⚡ 💚 -40% 💎 78%");
  });

  it("omits cache suffix when cacheRate is null", () => {
    const result = computeCompare(before, after, lastMonthRange, thisMonthRange);
    expect(renderStatusline(result, "normal", { cacheRate: null })).toBe(
      "💚 -40%",
    );
  });
});
