import { describe, it, expect } from "vitest";
import { parseRecord } from "../src/schema.js";

describe("parseRecord", () => {
  it("parses a valid assistant record", () => {
    const line = JSON.stringify({
      type: "assistant",
      timestamp: "2026-04-22T00:00:00Z",
      message: {
        model: "claude-opus-4-7",
        usage: { input_tokens: 10, output_tokens: 20 },
      },
    });
    const rec = parseRecord(line);
    expect(rec).not.toBeNull();
    expect(rec?.type).toBe("assistant");
    expect(rec?.message?.model).toBe("claude-opus-4-7");
  });

  it("returns null for broken JSON", () => {
    expect(parseRecord("{not json")).toBeNull();
  });

  it("returns null for empty line", () => {
    expect(parseRecord("")).toBeNull();
    expect(parseRecord("   ")).toBeNull();
  });

  it("returns null for a record missing type", () => {
    const line = JSON.stringify({ timestamp: "2026-04-22T00:00:00Z" });
    expect(parseRecord(line)).toBeNull();
  });

  it("preserves unknown fields via passthrough", () => {
    const line = JSON.stringify({
      type: "user",
      extraField: "value",
      timestamp: "2026-04-22T00:00:00Z",
    });
    const rec = parseRecord(line);
    expect(rec).not.toBeNull();
    expect((rec as unknown as Record<string, unknown>).extraField).toBe(
      "value",
    );
  });
});
