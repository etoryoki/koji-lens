import type { SessionAggregate } from "@kojihq/core";
import type { SessionRow } from "./schema.js";

export interface CachedSessionAggregate extends SessionAggregate {
  mtimeMs: number;
  cachedAt: number;
}

// SessionAggregate → upsert payload (writer)
export function aggregateToRow(
  agg: SessionAggregate,
  mtimeMs: number,
  cachedAt: number = Date.now(),
): SessionRow {
  return {
    sessionId: agg.sessionId,
    filePath: agg.filePath,
    mtimeMs,
    cachedAt,
    startedAt: agg.startedAt,
    endedAt: agg.endedAt,
    durationMs: agg.durationMs,
    assistantTurns: agg.assistantTurns,
    userTurns: agg.userTurns,
    sidechainCount: agg.sidechainCount,
    inputTokens: agg.inputTokens,
    outputTokens: agg.outputTokens,
    cacheReadTokens: agg.cacheReadTokens,
    cacheCreateTokens: agg.cacheCreateTokens,
    costUsd: agg.costUsd,
    modelsJson: JSON.stringify(agg.models),
    toolsJson: JSON.stringify(agg.tools),
    costsByModelJson: JSON.stringify(agg.costsByModel),
    modelChangesJson: JSON.stringify(agg.modelChanges),
    latencyP50Ms: agg.latencyP50Ms,
    latencyP95Ms: agg.latencyP95Ms,
  };
}

// SessionRow → CachedSessionAggregate (reader)
export function rowToCachedAggregate(row: SessionRow): CachedSessionAggregate {
  return {
    sessionId: row.sessionId,
    filePath: row.filePath,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    durationMs: row.durationMs,
    assistantTurns: row.assistantTurns,
    userTurns: row.userTurns,
    sidechainCount: row.sidechainCount,
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
    cacheReadTokens: row.cacheReadTokens,
    cacheCreateTokens: row.cacheCreateTokens,
    costUsd: row.costUsd,
    models: JSON.parse(row.modelsJson),
    tools: JSON.parse(row.toolsJson),
    costsByModel: JSON.parse(row.costsByModelJson),
    modelChanges: JSON.parse(row.modelChangesJson),
    latencyP50Ms: row.latencyP50Ms,
    latencyP95Ms: row.latencyP95Ms,
    mtimeMs: row.mtimeMs,
    cachedAt: row.cachedAt,
  };
}
