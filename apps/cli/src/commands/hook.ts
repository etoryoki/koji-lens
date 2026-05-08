// Cross-platform hook command for Claude Code hooks integration.
// Replaces the per-OS set-state.ps1 / set-state.sh pattern with a built-in
// CLI command that writes ~/.koji-lens/state.json regardless of OS.
//
// Usage in ~/.claude/settings.json hooks:
//   "command": "koji-lens hook thinking"
//   "command": "koji-lens hook running"
//   "command": "koji-lens hook awaiting_approval"
//   "command": "koji-lens hook idle"

import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const VALID_STATES = [
  "thinking",
  "running",
  "idle",
  "awaiting_approval",
] as const;

type AgentState = (typeof VALID_STATES)[number];

function isValidState(s: string): s is AgentState {
  return (VALID_STATES as readonly string[]).includes(s);
}

export async function hookCommand(state: string): Promise<void> {
  if (!isValidState(state)) {
    console.error(
      `Invalid state: "${state}". Expected one of: ${VALID_STATES.join(" | ")}`,
    );
    process.exit(1);
  }

  const filePath = join(homedir(), ".koji-lens", "state.json");
  mkdirSync(dirname(filePath), { recursive: true });

  const payload = {
    state,
    since: Date.now(),
  };
  writeFileSync(filePath, JSON.stringify(payload), "utf8");
  // Hooks run silently in Claude Code; no stdout output needed.
}
