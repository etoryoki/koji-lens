import { describe, expect, it } from "vitest";
import {
  computeBuddyLevel,
  computeBuddyState,
  renderBuddy,
  renderBuddyDecoration,
  renderBuddySaying,
} from "../src/buddy.js";
import type { CompareResult } from "../src/compare.js";

function makeResult(
  before: number,
  after: number,
  sessionsBefore = 1,
  sessionsAfter = 1,
): CompareResult {
  return {
    before: {
      range: { from: "2026-04-01", to: "2026-04-30" },
      dayCount: 30,
      sessionsCount: sessionsBefore,
      totalCostUsd: before,
      totalTokens: 0,
      costByModel: {},
      toolsCount: {},
    },
    after: {
      range: { from: "2026-05-01", to: "2026-05-31" },
      dayCount: 31,
      sessionsCount: sessionsAfter,
      totalCostUsd: after,
      totalTokens: 0,
      costByModel: {},
      toolsCount: {},
    },
    delta: {
      costUsd: after - before,
      costUsdPct: before > 0 ? ((after - before) / before) * 100 : 0,
      sessionsCount: sessionsAfter - sessionsBefore,
      sessionsCountPct: 0,
      costByModel: {},
      toolsTopChanged: [],
    },
  };
}

describe("computeBuddyLevel (v0.6 Lv1-10, 3-year Max design)", () => {
  it("Lv1 for 0-29 sessions", () => {
    expect(computeBuddyLevel(0)).toBe(1);
    expect(computeBuddyLevel(29)).toBe(1);
  });
  it("Lv2 for 30-99 sessions", () => {
    expect(computeBuddyLevel(30)).toBe(2);
    expect(computeBuddyLevel(99)).toBe(2);
  });
  it("Lv3 for 100-299 sessions", () => {
    expect(computeBuddyLevel(100)).toBe(3);
    expect(computeBuddyLevel(299)).toBe(3);
  });
  it("Lv4 for 300-999 sessions", () => {
    expect(computeBuddyLevel(300)).toBe(4);
    expect(computeBuddyLevel(999)).toBe(4);
  });
  it("Lv5 for 1000-2999 sessions", () => {
    expect(computeBuddyLevel(1000)).toBe(5);
    expect(computeBuddyLevel(2999)).toBe(5);
  });
  it("Lv6 for 3000-9999 sessions", () => {
    expect(computeBuddyLevel(3000)).toBe(6);
    expect(computeBuddyLevel(9999)).toBe(6);
  });
  it("Lv7 for 10000-29999 sessions", () => {
    expect(computeBuddyLevel(10000)).toBe(7);
    expect(computeBuddyLevel(29999)).toBe(7);
  });
  it("Lv8 for 30000-59999 sessions", () => {
    expect(computeBuddyLevel(30000)).toBe(8);
    expect(computeBuddyLevel(59999)).toBe(8);
  });
  it("Lv9 for 60000-99999 sessions", () => {
    expect(computeBuddyLevel(60000)).toBe(9);
    expect(computeBuddyLevel(99999)).toBe(9);
  });
  it("Lv10 for 100000+ sessions (Max, ~3 years for heavy users)", () => {
    expect(computeBuddyLevel(100000)).toBe(10);
    expect(computeBuddyLevel(1000000)).toBe(10);
  });
});

describe("computeBuddyState", () => {
  it("awaiting when agentState is awaiting_approval", () => {
    const result = makeResult(100, 100);
    expect(computeBuddyState(result, "awaiting_approval")).toBe("awaiting");
  });

  it("resting when agentState is idle", () => {
    const result = makeResult(100, 100);
    expect(computeBuddyState(result, "idle")).toBe("resting");
  });

  it("healthy when cost change is small", () => {
    const result = makeResult(100, 110); // +10%
    expect(computeBuddyState(result, "running")).toBe("healthy");
  });

  it("overfed when cost change >= 20%", () => {
    const result = makeResult(100, 130); // +30%
    expect(computeBuddyState(result, "running")).toBe("overfed");
  });

  it("sick when cost change >= 50%", () => {
    const result = makeResult(100, 200); // +100%
    expect(computeBuddyState(result, "running")).toBe("sick");
  });

  it("resting when no sessions in either period", () => {
    const result = makeResult(0, 0, 0, 0);
    expect(computeBuddyState(result, null)).toBe("resting");
  });
});

describe("renderBuddy (koji 50 sayings, Lv1-10 v0.6)", () => {
  it("returns decoration with rice ball icon", () => {
    const r = renderBuddy("healthy", 1, "koji");
    expect(r.decoration).toBe("🍙·");
  });

  it("Lv5 uses double star", () => {
    const r = renderBuddy("healthy", 5, "koji");
    expect(r.decoration).toBe("🍙★★");
  });

  it("Lv10 uses double florette (❀❀, ultimate fermentation deepening)", () => {
    const r = renderBuddy("healthy", 10, "koji");
    expect(r.decoration).toBe("🍙❀❀");
  });

  it("returns 50 sayings (5 states × 10 levels matrix coverage)", () => {
    const states = ["healthy", "overfed", "resting", "awaiting", "sick"] as const;
    const levels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
    for (const state of states) {
      for (const level of levels) {
        const saying = renderBuddySaying(state, level, "koji");
        expect(saying.length).toBeGreaterThan(0);
        expect(saying).not.toContain("Coming soon");
      }
    }
  });

  it("returns 'Coming soon' for Phase β types (owl / cat)", () => {
    expect(renderBuddySaying("healthy", 1, "owl")).toContain("Coming soon");
    expect(renderBuddySaying("healthy", 1, "cat")).toContain("Coming soon");
  });

  it("flagship Lv5 sick saying = Ferment Small symbol (Phase α)", () => {
    expect(renderBuddySaying("sick", 5, "koji")).toContain(
      "分解が始まってます…でも、再生できます…",
    );
  });

  it("flagship Lv10 healthy saying = silent presence (v0.6, Shirakawa Critical 1 採用)", () => {
    expect(renderBuddySaying("healthy", 10, "koji")).toContain(
      "ただ、在る",
    );
  });
});

describe("renderBuddyDecoration", () => {
  it("returns icon + decoration without saying", () => {
    expect(renderBuddyDecoration("healthy", 3, "koji")).toBe("🍙✦");
    expect(renderBuddyDecoration("sick", 5, "owl")).toBe("🦉★★");
    expect(renderBuddyDecoration("resting", 2, "cat")).toBe("🐈+");
  });
});
