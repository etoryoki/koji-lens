import { eq } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type { SessionAggregate } from "@kojihq/core";
import { sessions, auditEventsCache, type SessionRow } from "./schema.js";

// 2026-05-17 改善案 A: audit events cache (file 単位、mtime + size invalidation)
export interface AuditEventsCacheEntry {
  filePath: string;
  fileMtimeMs: number;
  fileSize: number;
  events: unknown[]; // AuditEvent[] (core からの import 循環回避のため unknown)
}

export function getAuditEventsCacheIfFresh(
  db: BetterSQLite3Database,
  filePath: string,
  currentMtimeMs: number,
  currentSize: number,
): AuditEventsCacheEntry | null {
  const row = db
    .select()
    .from(auditEventsCache)
    .where(eq(auditEventsCache.filePath, filePath))
    .get();
  if (!row) return null;
  // mtime or size 変化 = cache miss
  if (row.fileMtimeMs !== currentMtimeMs || row.fileSize !== currentSize) {
    return null;
  }
  return {
    filePath: row.filePath,
    fileMtimeMs: row.fileMtimeMs,
    fileSize: row.fileSize,
    events: JSON.parse(row.eventsJson) as unknown[],
  };
}

export function upsertAuditEventsCache(
  db: BetterSQLite3Database,
  filePath: string,
  mtimeMs: number,
  size: number,
  events: unknown[],
): void {
  const row = {
    filePath,
    fileMtimeMs: mtimeMs,
    fileSize: size,
    eventsJson: JSON.stringify(events),
    cachedAt: Date.now(),
  };
  db.insert(auditEventsCache)
    .values(row)
    .onConflictDoUpdate({ target: auditEventsCache.filePath, set: row })
    .run();
}

export function clearAuditEventsCache(db: BetterSQLite3Database): void {
  db.delete(auditEventsCache).run();
}

export interface CachedSessionAggregate extends SessionAggregate {
  mtimeMs: number;
  cachedAt: number;
}

export function upsertSessionCache(
  db: BetterSQLite3Database,
  agg: SessionAggregate,
  mtimeMs: number,
): void {
  const row = {
    sessionId: agg.sessionId,
    filePath: agg.filePath,
    mtimeMs,
    cachedAt: Date.now(),
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
  db.insert(sessions)
    .values(row)
    .onConflictDoUpdate({ target: sessions.sessionId, set: row })
    .run();
}

export function getSessionCache(
  db: BetterSQLite3Database,
  sessionId: string,
): CachedSessionAggregate | null {
  const row = db
    .select()
    .from(sessions)
    .where(eq(sessions.sessionId, sessionId))
    .get();
  return row ? rowToCachedAggregate(row) : null;
}

export function listSessionCaches(
  db: BetterSQLite3Database,
): CachedSessionAggregate[] {
  const rows = db.select().from(sessions).all();
  return rows.map(rowToCachedAggregate);
}

export function isCacheFresh(
  db: BetterSQLite3Database,
  sessionId: string,
  currentMtimeMs: number,
): boolean {
  const row = db
    .select({ mtimeMs: sessions.mtimeMs })
    .from(sessions)
    .where(eq(sessions.sessionId, sessionId))
    .get();
  return row ? row.mtimeMs >= currentMtimeMs : false;
}

export function getSessionCacheIfFresh(
  db: BetterSQLite3Database,
  sessionId: string,
  currentMtimeMs: number,
): CachedSessionAggregate | null {
  const row = db
    .select()
    .from(sessions)
    .where(eq(sessions.sessionId, sessionId))
    .get();
  if (!row || row.mtimeMs < currentMtimeMs) return null;
  return rowToCachedAggregate(row);
}

export function clearSessionCache(db: BetterSQLite3Database): number {
  const result = db.delete(sessions).run();
  return Number(result.changes ?? 0);
}

function rowToCachedAggregate(row: SessionRow): CachedSessionAggregate {
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
