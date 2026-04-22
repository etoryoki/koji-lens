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
