import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readAgentState } from "../src/state.js";

const tmpFile = join(tmpdir(), `koji-lens-state-test-${process.pid}.json`);

describe("readAgentState", () => {
  beforeEach(() => {
    const dir = tmpdir();
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tmpFile)) unlinkSync(tmpFile);
  });

  it("returns null icon when file does not exist", () => {
    const result = readAgentState("/nonexistent/path/state.json");
    expect(result.icon).toBeNull();
    expect(result.state).toBeNull();
  });

  it("returns null icon when file is malformed JSON", () => {
    writeFileSync(tmpFile, "not json");
    const result = readAgentState(tmpFile);
    expect(result.icon).toBeNull();
    expect(result.state).toBeNull();
  });

  it("maps thinking state to ⚡", () => {
    const now = 1_700_000_000_000;
    writeFileSync(
      tmpFile,
      JSON.stringify({ state: "thinking", since: now - 1000 }),
    );
    const result = readAgentState(tmpFile, now);
    expect(result.icon).toBe("⚡");
    expect(result.state).toBe("thinking");
  });

  it("maps running state to ⚡", () => {
    const now = 1_700_000_000_000;
    writeFileSync(
      tmpFile,
      JSON.stringify({ state: "running", since: now - 1000, tool: "Bash" }),
    );
    const result = readAgentState(tmpFile, now);
    expect(result.icon).toBe("⚡");
    expect(result.state).toBe("running");
  });

  it("maps idle state to 💤", () => {
    const now = 1_700_000_000_000;
    writeFileSync(
      tmpFile,
      JSON.stringify({ state: "idle", since: now - 1000 }),
    );
    const result = readAgentState(tmpFile, now);
    expect(result.icon).toBe("💤");
  });

  it("maps awaiting_approval state to 🛑", () => {
    const now = 1_700_000_000_000;
    writeFileSync(
      tmpFile,
      JSON.stringify({ state: "awaiting_approval", since: now - 1000 }),
    );
    const result = readAgentState(tmpFile, now);
    expect(result.icon).toBe("🛑");
  });

  it("returns null icon when state is older than stale threshold", () => {
    const now = 1_700_000_000_000;
    writeFileSync(
      tmpFile,
      JSON.stringify({ state: "thinking", since: now - 70_000 }),
    );
    const result = readAgentState(tmpFile, now);
    expect(result.icon).toBeNull();
    expect(result.state).toBe("thinking");
    expect(result.staleMs).toBeGreaterThan(60_000);
  });

  it("returns null icon for unknown state value", () => {
    const now = 1_700_000_000_000;
    writeFileSync(
      tmpFile,
      JSON.stringify({ state: "exploding", since: now - 1000 }),
    );
    const result = readAgentState(tmpFile, now);
    expect(result.icon).toBeNull();
  });
});
