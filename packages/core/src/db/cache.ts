import { eq } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type { SessionAggregate } from "../aggregate.js";
import { sessions } from "./schema.js";

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

export function clearSessionCache(db: BetterSQLite3Database): number {
  const result = db.delete(sessions).run();
  return Number(result.changes ?? 0);
}

type SessionRow = typeof sessions.$inferSelect;

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
    mtimeMs: row.mtimeMs,
    cachedAt: row.cachedAt,
  };
}
