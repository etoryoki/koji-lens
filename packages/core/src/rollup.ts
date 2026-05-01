import type { SessionAggregate } from "./aggregate.js";
import { extractParentFromPath } from "./format.js";

export interface SessionAggregateWithChildren extends SessionAggregate {
  subagents: SessionAggregate[];
}

function mergeNumericRecord(
  target: Record<string, number>,
  src: Record<string, number>,
): void {
  for (const [k, v] of Object.entries(src)) {
    target[k] = (target[k] ?? 0) + v;
  }
}

export function rollupSubagents(
  aggs: SessionAggregate[],
): SessionAggregateWithChildren[] {
  const byId = new Map<string, SessionAggregateWithChildren>();
  for (const a of aggs) {
    if (extractParentFromPath(a.filePath)) continue;
    byId.set(a.sessionId, { ...a, subagents: [] });
  }

  const orphans: SessionAggregateWithChildren[] = [];
  for (const a of aggs) {
    const parentId = extractParentFromPath(a.filePath);
    if (!parentId) continue;
    const parent = byId.get(parentId);
    if (!parent) {
      orphans.push({ ...a, subagents: [] });
      continue;
    }
    parent.subagents.push(a);
    parent.assistantTurns += a.assistantTurns;
    parent.userTurns += a.userTurns;
    parent.sidechainCount += a.sidechainCount;
    parent.inputTokens += a.inputTokens;
    parent.outputTokens += a.outputTokens;
    parent.cacheReadTokens += a.cacheReadTokens;
    parent.cacheCreateTokens += a.cacheCreateTokens;
    parent.costUsd += a.costUsd;
    mergeNumericRecord(parent.models, a.models);
    mergeNumericRecord(parent.costsByModel, a.costsByModel);
    mergeNumericRecord(parent.tools, a.tools);
  }

  return [...byId.values(), ...orphans];
}
