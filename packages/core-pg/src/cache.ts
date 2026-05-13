import type { SessionAggregate } from "@kojihq/core";
import type { SessionRow } from "./schema.js";

export interface CachedSessionAggregate extends SessionAggregate {
  mtimeMs: number;
  cachedAt: number;
}

// SessionAggregate → upsert payload (writer)
//
// 5/13 v0.2 で sessions に clerk_user_id 追加 (NULL 許容)、aggregateToRow では
// `clerkUserId: null` を default 設定。CLI sync コマンドで実際に POST する際に
// サーバー側 `/api/sync` で opaque token から解決した clerk_user_id を付与する
// (CLI 側 cache.db には clerk_user_id を保存しない、ローカル分析は引き続き全 Free)。
//
// 5/13 Critical bug 3 対処: Postgres bigint は整数のみで stat().mtimeMs の
// マイクロ秒精度の少数値で syntax error 発生、整数化必須。SQLite INTEGER は
// 型柔軟で許容するが、Postgres 互換性のため writer 段階で `Math.floor()` 適用。
export function aggregateToRow(
  agg: SessionAggregate,
  mtimeMs: number,
  cachedAt: number = Date.now(),
  clerkUserId: string | null = null,
): SessionRow {
  return {
    sessionId: agg.sessionId,
    filePath: agg.filePath,
    mtimeMs: Math.floor(mtimeMs),
    cachedAt: Math.floor(cachedAt),
    startedAt: agg.startedAt,
    endedAt: agg.endedAt,
    durationMs: Math.floor(agg.durationMs),
    assistantTurns: Math.floor(agg.assistantTurns),
    userTurns: Math.floor(agg.userTurns),
    sidechainCount: Math.floor(agg.sidechainCount),
    inputTokens: Math.floor(agg.inputTokens),
    outputTokens: Math.floor(agg.outputTokens),
    cacheReadTokens: Math.floor(agg.cacheReadTokens),
    cacheCreateTokens: Math.floor(agg.cacheCreateTokens),
    costUsd: agg.costUsd,
    modelsJson: JSON.stringify(agg.models),
    toolsJson: JSON.stringify(agg.tools),
    costsByModelJson: JSON.stringify(agg.costsByModel),
    modelChangesJson: JSON.stringify(agg.modelChanges),
    latencyP50Ms: Math.floor(agg.latencyP50Ms),
    latencyP95Ms: Math.floor(agg.latencyP95Ms),
    clerkUserId,
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
