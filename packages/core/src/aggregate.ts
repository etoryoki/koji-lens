import { priceFor } from "./pricing.js";
import type { ClaudeCodeRecord, Usage } from "./schema.js";

export interface SessionAggregate {
  sessionId: string;
  filePath: string;
  startedAt: string | null;
  endedAt: string | null;
  durationMs: number;
  assistantTurns: number;
  userTurns: number;
  sidechainCount: number;
  models: Record<string, number>;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreateTokens: number;
  costUsd: number;
  tools: Record<string, number>;
}

export function createEmptyAggregate(
  sessionId: string,
  filePath: string,
): SessionAggregate {
  return {
    sessionId,
    filePath,
    startedAt: null,
    endedAt: null,
    durationMs: 0,
    assistantTurns: 0,
    userTurns: 0,
    sidechainCount: 0,
    models: {},
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheCreateTokens: 0,
    costUsd: 0,
    tools: {},
  };
}

export function applyUsage(
  agg: SessionAggregate,
  model: string | undefined,
  usage: Usage | undefined,
): void {
  if (!usage) return;
  const price = priceFor(model);
  const inT = Number(usage.input_tokens ?? 0);
  const outT = Number(usage.output_tokens ?? 0);
  const cr = Number(usage.cache_read_input_tokens ?? 0);
  const cc = Number(usage.cache_creation_input_tokens ?? 0);
  agg.inputTokens += inT;
  agg.outputTokens += outT;
  agg.cacheReadTokens += cr;
  agg.cacheCreateTokens += cc;
  agg.costUsd +=
    (inT * price.input +
      outT * price.output +
      cr * price.cacheRead +
      cc * price.cacheWrite) /
    1_000_000;
}

function updateTimeRange(agg: SessionAggregate, ts: string | undefined) {
  if (!ts) return;
  if (!agg.startedAt || ts < agg.startedAt) agg.startedAt = ts;
  if (!agg.endedAt || ts > agg.endedAt) agg.endedAt = ts;
}

export function applyRecord(
  agg: SessionAggregate,
  rec: ClaudeCodeRecord,
): void {
  updateTimeRange(agg, rec.timestamp);
  if (rec.isSidechain) agg.sidechainCount += 1;

  if (rec.type === "assistant") {
    agg.assistantTurns += 1;
    const msg = rec.message;
    if (msg) {
      if (msg.model) {
        agg.models[msg.model] = (agg.models[msg.model] ?? 0) + 1;
      }
      applyUsage(agg, msg.model, msg.usage);
      if (msg.content) {
        for (const c of msg.content) {
          if (c.type === "tool_use" && typeof c.name === "string") {
            agg.tools[c.name] = (agg.tools[c.name] ?? 0) + 1;
          }
        }
      }
    }
  } else if (rec.type === "user") {
    agg.userTurns += 1;
  }
}

export function finalizeAggregate(agg: SessionAggregate): SessionAggregate {
  if (agg.startedAt && agg.endedAt) {
    agg.durationMs =
      new Date(agg.endedAt).getTime() - new Date(agg.startedAt).getTime();
  }
  return agg;
}

export interface TotalAggregate {
  sessionCount: number;
  durationMs: number;
  assistantTurns: number;
  userTurns: number;
  sidechainCount: number;
  models: Record<string, number>;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreateTokens: number;
  costUsd: number;
  tools: Record<string, number>;
}

export function sumAggregates(aggs: SessionAggregate[]): TotalAggregate {
  const total: TotalAggregate = {
    sessionCount: aggs.length,
    durationMs: 0,
    assistantTurns: 0,
    userTurns: 0,
    sidechainCount: 0,
    models: {},
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheCreateTokens: 0,
    costUsd: 0,
    tools: {},
  };
  for (const a of aggs) {
    total.durationMs += a.durationMs;
    total.assistantTurns += a.assistantTurns;
    total.userTurns += a.userTurns;
    total.sidechainCount += a.sidechainCount;
    total.inputTokens += a.inputTokens;
    total.outputTokens += a.outputTokens;
    total.cacheReadTokens += a.cacheReadTokens;
    total.cacheCreateTokens += a.cacheCreateTokens;
    total.costUsd += a.costUsd;
    for (const [k, v] of Object.entries(a.models)) {
      total.models[k] = (total.models[k] ?? 0) + v;
    }
    for (const [k, v] of Object.entries(a.tools)) {
      total.tools[k] = (total.tools[k] ?? 0) + v;
    }
  }
  return total;
}
