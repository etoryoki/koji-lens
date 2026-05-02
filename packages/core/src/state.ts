import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export type AgentState =
  | "thinking"
  | "running"
  | "idle"
  | "awaiting_approval";

export interface AgentStateFile {
  state: AgentState;
  since: number;
  tool?: string;
}

export interface AgentStateRead {
  icon: string | null;
  state: AgentState | null;
  staleMs: number | null;
}

const DEFAULT_STALE_MS = 60_000;

export function defaultStateFilePath(): string {
  return join(homedir(), ".koji-lens", "state.json");
}

export function readAgentState(
  filePath: string = defaultStateFilePath(),
  now: number = Date.now(),
  staleThresholdMs: number = DEFAULT_STALE_MS,
): AgentStateRead {
  let parsed: AgentStateFile;
  try {
    const raw = readFileSync(filePath, "utf8");
    parsed = JSON.parse(raw) as AgentStateFile;
  } catch {
    return { icon: null, state: null, staleMs: null };
  }

  if (!parsed || typeof parsed.since !== "number") {
    return { icon: null, state: null, staleMs: null };
  }

  const age = now - parsed.since;
  if (age > staleThresholdMs) {
    return { icon: null, state: parsed.state ?? null, staleMs: age };
  }

  return {
    icon: stateIcon(parsed.state),
    state: parsed.state ?? null,
    staleMs: age,
  };
}

function stateIcon(state: AgentState | undefined): string | null {
  switch (state) {
    case "thinking":
    case "running":
      return "⚡";
    case "idle":
      return "💤";
    case "awaiting_approval":
      return "🛑";
    default:
      return null;
  }
}
