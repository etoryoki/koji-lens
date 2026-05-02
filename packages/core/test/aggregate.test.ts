import { describe, it, expect } from "vitest";
import {
  applyRecord,
  createEmptyAggregate,
  finalizeAggregate,
  sumAggregates,
} from "../src/aggregate.js";
import type { ClaudeCodeRecord } from "../src/schema.js";

function assistantRecord(
  overrides: Partial<ClaudeCodeRecord["message"] & object> = {},
  timestamp = "2026-04-22T10:00:00Z",
): ClaudeCodeRecord {
  return {
    type: "assistant",
    timestamp,
    message: {
      model: "claude-opus-4-7",
      usage: {
        input_tokens: 100,
        output_tokens: 200,
      },
      ...overrides,
    },
  };
}

describe("applyRecord / finalizeAggregate", () => {
  it("counts assistant/user turns", () => {
    const agg = createEmptyAggregate("s1", "/tmp/s1.jsonl");
    applyRecord(agg, assistantRecord());
    applyRecord(agg, { type: "user", timestamp: "2026-04-22T10:00:01Z" });
    applyRecord(agg, assistantRecord({}, "2026-04-22T10:00:02Z"));
    expect(agg.assistantTurns).toBe(2);
    expect(agg.userTurns).toBe(1);
  });

  it("accumulates token usage and computes cost (opus 4.7)", () => {
    const agg = createEmptyAggregate("s1", "/tmp/s1.jsonl");
    applyRecord(agg, assistantRecord());
    applyRecord(agg, assistantRecord());
    expect(agg.inputTokens).toBe(200);
    expect(agg.outputTokens).toBe(400);
    // opus 4.7: input $15 / 1M, output $75 / 1M
    // 200 * 15 / 1M + 400 * 75 / 1M = 0.003 + 0.030 = 0.033
    expect(agg.costUsd).toBeCloseTo(0.033, 4);
  });

  it("records tool use counts", () => {
    const agg = createEmptyAggregate("s1", "/tmp/s1.jsonl");
    applyRecord(agg, {
      type: "assistant",
      timestamp: "2026-04-22T10:00:00Z",
      message: {
        model: "claude-opus-4-7",
        content: [
          { type: "tool_use", name: "Bash" },
          { type: "tool_use", name: "Read" },
          { type: "tool_use", name: "Bash" },
          { type: "text" },
        ],
      },
    });
    expect(agg.tools).toEqual({ Bash: 2, Read: 1 });
  });

  it("finalizes durationMs from startedAt/endedAt", () => {
    const agg = createEmptyAggregate("s1", "/tmp/s1.jsonl");
    applyRecord(agg, assistantRecord({}, "2026-04-22T10:00:00Z"));
    applyRecord(agg, assistantRecord({}, "2026-04-22T10:05:00Z"));
    finalizeAggregate(agg);
    expect(agg.durationMs).toBe(5 * 60 * 1000);
  });

  it("increments sidechainCount when isSidechain=true", () => {
    const agg = createEmptyAggregate("s1", "/tmp/s1.jsonl");
    applyRecord(agg, {
      type: "assistant",
      timestamp: "2026-04-22T10:00:00Z",
      isSidechain: true,
      message: { model: "claude-opus-4-7" },
    });
    expect(agg.sidechainCount).toBe(1);
  });
});

describe("modelChanges (Phase A 拡張)", () => {
  it("does not record change on the first assistant model", () => {
    const agg = createEmptyAggregate("s1", "/tmp/s1.jsonl");
    applyRecord(agg, assistantRecord({ model: "claude-opus-4-7" }));
    expect(agg.modelChanges).toEqual([]);
  });

  it("records change when assistant model differs from previous", () => {
    const agg = createEmptyAggregate("s1", "/tmp/s1.jsonl");
    applyRecord(
      agg,
      assistantRecord({ model: "claude-opus-4-7" }, "2026-04-22T10:00:00Z"),
    );
    applyRecord(
      agg,
      assistantRecord({ model: "claude-sonnet-4-6" }, "2026-04-22T10:01:00Z"),
    );
    expect(agg.modelChanges).toHaveLength(1);
    expect(agg.modelChanges[0].fromModel).toBe("claude-opus-4-7");
    expect(agg.modelChanges[0].toModel).toBe("claude-sonnet-4-6");
    expect(agg.modelChanges[0].at).toBe("2026-04-22T10:01:00Z");
  });

  it("does not record change when same model used twice", () => {
    const agg = createEmptyAggregate("s1", "/tmp/s1.jsonl");
    applyRecord(agg, assistantRecord({ model: "claude-opus-4-7" }));
    applyRecord(
      agg,
      assistantRecord({ model: "claude-opus-4-7" }, "2026-04-22T10:01:00Z"),
    );
    expect(agg.modelChanges).toEqual([]);
  });
});

describe("response latency tracking (Phase A 拡張)", () => {
  it("computes p50/p95 from user→assistant timestamp diffs", () => {
    const agg = createEmptyAggregate("s1", "/tmp/s1.jsonl");
    const pairs: Array<[string, string]> = [
      ["2026-04-22T10:00:00.000Z", "2026-04-22T10:00:02.000Z"], // 2000ms
      ["2026-04-22T10:01:00.000Z", "2026-04-22T10:01:05.000Z"], // 5000ms
      ["2026-04-22T10:02:00.000Z", "2026-04-22T10:02:01.000Z"], // 1000ms
      ["2026-04-22T10:03:00.000Z", "2026-04-22T10:03:10.000Z"], // 10000ms
    ];
    for (const [userTs, assistantTs] of pairs) {
      applyRecord(agg, { type: "user", timestamp: userTs });
      applyRecord(agg, assistantRecord({}, assistantTs));
    }
    finalizeAggregate(agg);
    expect(agg.latencyP50Ms).toBeGreaterThan(0);
    expect(agg.latencyP95Ms).toBeGreaterThanOrEqual(agg.latencyP50Ms);
  });

  it("ignores latency when user record is sidechain", () => {
    const agg = createEmptyAggregate("s1", "/tmp/s1.jsonl");
    applyRecord(agg, {
      type: "user",
      timestamp: "2026-04-22T10:00:00.000Z",
      isSidechain: true,
    });
    applyRecord(agg, assistantRecord({}, "2026-04-22T10:00:05.000Z"));
    finalizeAggregate(agg);
    expect(agg.latencyP50Ms).toBe(0);
  });

  it("ignores latency > 10 minutes (likely overnight idle)", () => {
    const agg = createEmptyAggregate("s1", "/tmp/s1.jsonl");
    applyRecord(agg, { type: "user", timestamp: "2026-04-22T10:00:00.000Z" });
    applyRecord(agg, assistantRecord({}, "2026-04-22T22:00:00.000Z"));
    finalizeAggregate(agg);
    expect(agg.latencyP50Ms).toBe(0);
  });
});

describe("sumAggregates", () => {
  it("combines cost, tokens, tools, models across sessions", () => {
    const a = createEmptyAggregate("s1", "/tmp/s1.jsonl");
    applyRecord(a, assistantRecord());
    a.tools.Bash = 3;
    a.models["claude-opus-4-7"] = 1;

    const b = createEmptyAggregate("s2", "/tmp/s2.jsonl");
    applyRecord(b, assistantRecord());
    b.tools.Read = 2;
    b.tools.Bash = 1;
    b.models["claude-opus-4-7"] = 1;

    const total = sumAggregates([a, b]);
    expect(total.sessionCount).toBe(2);
    expect(total.inputTokens).toBe(200);
    expect(total.outputTokens).toBe(400);
    expect(total.tools).toEqual({ Bash: 4, Read: 2 });
    expect(total.models).toEqual({ "claude-opus-4-7": 2 });
  });
});
