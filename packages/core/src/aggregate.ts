import { priceFor } from "./pricing.js";
import type { ClaudeCodeRecord, Usage } from "./schema.js";

export interface ModelChange {
  fromModel: string | null;
  toModel: string;
  at: string;
}

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
  costsByModel: Record<string, number>;
  tools: Record<string, number>;
  modelChanges: ModelChange[];
  latencyP50Ms: number;
  latencyP95Ms: number;
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
    costsByModel: {},
    tools: {},
    modelChanges: [],
    latencyP50Ms: 0,
    latencyP95Ms: 0,
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
  const cost =
    (inT * price.input +
      outT * price.output +
      cr * price.cacheRead +
      cc * price.cacheWrite) /
    1_000_000;
  agg.costUsd += cost;
  if (model) {
    agg.costsByModel[model] = (agg.costsByModel[model] ?? 0) + cost;
  }
}

function updateTimeRange(agg: SessionAggregate, ts: string | undefined) {
  if (!ts) return;
  if (!agg.startedAt || ts < agg.startedAt) agg.startedAt = ts;
  if (!agg.endedAt || ts > agg.endedAt) agg.endedAt = ts;
}

interface AggregateScratch {
  lastUserAt: string | null;
  lastAssistantModel: string | null;
  latencies: number[];
}

const SCRATCH = new WeakMap<SessionAggregate, AggregateScratch>();

function getScratch(agg: SessionAggregate): AggregateScratch {
  let s = SCRATCH.get(agg);
  if (!s) {
    s = { lastUserAt: null, lastAssistantModel: null, latencies: [] };
    SCRATCH.set(agg, s);
  }
  return s;
}

export function applyRecord(
  agg: SessionAggregate,
  rec: ClaudeCodeRecord,
): void {
  updateTimeRange(agg, rec.timestamp);
  if (rec.isSidechain) agg.sidechainCount += 1;

  const scratch = getScratch(agg);

  if (rec.type === "assistant") {
    agg.assistantTurns += 1;
    const msg = rec.message;
    if (msg) {
      if (msg.model) {
        agg.models[msg.model] = (agg.models[msg.model] ?? 0) + 1;

        if (
          scratch.lastAssistantModel !== null &&
          scratch.lastAssistantModel !== msg.model
        ) {
          agg.modelChanges.push({
            fromModel: scratch.lastAssistantModel,
            toModel: msg.model,
            at: rec.timestamp ?? "",
          });
        }
        scratch.lastAssistantModel = msg.model;
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

    if (scratch.lastUserAt && rec.timestamp && !rec.isSidechain) {
      const latency =
        new Date(rec.timestamp).getTime() - new Date(scratch.lastUserAt).getTime();
      if (latency > 0 && latency < 600_000) {
        scratch.latencies.push(latency);
      }
      scratch.lastUserAt = null;
    }
  } else if (rec.type === "user") {
    agg.userTurns += 1;
    if (rec.timestamp && !rec.isSidechain) {
      scratch.lastUserAt = rec.timestamp;
    }
  }
}

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.min(
    sortedAsc.length - 1,
    Math.floor((p / 100) * sortedAsc.length),
  );
  return sortedAsc[idx];
}

export function finalizeAggregate(agg: SessionAggregate): SessionAggregate {
  if (agg.startedAt && agg.endedAt) {
    agg.durationMs =
      new Date(agg.endedAt).getTime() - new Date(agg.startedAt).getTime();
  }
  const scratch = SCRATCH.get(agg);
  if (scratch && scratch.latencies.length > 0) {
    const sorted = [...scratch.latencies].sort((a, b) => a - b);
    agg.latencyP50Ms = percentile(sorted, 50);
    agg.latencyP95Ms = percentile(sorted, 95);
  }
  SCRATCH.delete(agg);
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
  costsByModel: Record<string, number>;
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
    costsByModel: {},
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
    for (const [k, v] of Object.entries(a.costsByModel)) {
      total.costsByModel[k] = (total.costsByModel[k] ?? 0) + v;
    }
    for (const [k, v] of Object.entries(a.tools)) {
      total.tools[k] = (total.tools[k] ?? 0) + v;
    }
  }
  return total;
}
