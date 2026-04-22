import { describe, it, expect } from "vitest";
import { parseSince } from "../src/analyze.js";

describe("parseSince", () => {
  const NOW = new Date("2026-04-22T12:00:00Z");

  it("parses 24h as 24 hours ago", () => {
    const d = parseSince("24h", NOW);
    expect(d.toISOString()).toBe("2026-04-21T12:00:00.000Z");
  });

  it("parses 7d as 7 days ago", () => {
    const d = parseSince("7d", NOW);
    expect(d.toISOString()).toBe("2026-04-15T12:00:00.000Z");
  });

  it("parses 2w as 14 days ago", () => {
    const d = parseSince("2w", NOW);
    expect(d.toISOString()).toBe("2026-04-08T12:00:00.000Z");
  });

  it("parses ISO date", () => {
    const d = parseSince("2026-04-01", NOW);
    expect(d.toISOString()).toBe("2026-04-01T00:00:00.000Z");
  });

  it("throws on invalid expression", () => {
    expect(() => parseSince("not-a-date", NOW)).toThrow(/Invalid --since/);
  });

  it("trims whitespace", () => {
    const d = parseSince("  24h  ", NOW);
    expect(d.toISOString()).toBe("2026-04-21T12:00:00.000Z");
  });
});
