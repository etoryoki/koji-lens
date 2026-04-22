import { describe, it, expect } from "vitest";
import { listKnownModels, priceFor } from "../src/pricing.js";

describe("priceFor", () => {
  it("returns opus 4.7 price by default when model is undefined", () => {
    const p = priceFor(undefined);
    expect(p.input).toBe(15);
    expect(p.output).toBe(75);
  });

  it("returns exact price for claude-sonnet-4-6", () => {
    const p = priceFor("claude-sonnet-4-6");
    expect(p.input).toBe(3);
    expect(p.output).toBe(15);
  });

  it("falls back to default for unknown model", () => {
    const p = priceFor("some-unknown-model");
    expect(p.input).toBe(15);
    expect(p.output).toBe(75);
  });
});

describe("listKnownModels", () => {
  it("includes all three current model tiers", () => {
    const names = listKnownModels();
    expect(names).toContain("claude-opus-4-7");
    expect(names).toContain("claude-sonnet-4-6");
    expect(names).toContain("claude-haiku-4-5");
  });
});
