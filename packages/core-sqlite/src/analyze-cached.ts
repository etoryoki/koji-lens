import { statSync } from "node:fs";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import {
  analyzeFile,
  findJsonlFiles,
  sessionIdFromPath,
  type AnalyzeOptions,
  type SessionAggregate,
} from "@kojihq/core";
import { getSessionCacheIfFresh, upsertSessionCache } from "./cache.js";

export interface CachedAnalyzeOptions extends AnalyzeOptions {
  onHit?: (sessionId: string) => void;
  onMiss?: (sessionId: string) => void;
}

export async function analyzeDirectoryCached(
  rootDir: string,
  db: BetterSQLite3Database,
  opts: CachedAnalyzeOptions = {},
): Promise<SessionAggregate[]> {
  const files = findJsonlFiles(rootDir);
  const results: SessionAggregate[] = [];
  for (const f of files) {
    const sessionId = sessionIdFromPath(f);
    let mtimeMs: number;
    try {
      mtimeMs = statSync(f).mtimeMs;
    } catch {
      continue;
    }

    let agg: SessionAggregate | null = getSessionCacheIfFresh(
      db,
      sessionId,
      mtimeMs,
    );
    if (agg) {
      opts.onHit?.(sessionId);
    } else {
      agg = await analyzeFile(f);
      upsertSessionCache(db, agg, mtimeMs);
      opts.onMiss?.(sessionId);
    }

    if (opts.since && agg.endedAt && new Date(agg.endedAt) < opts.since) {
      continue;
    }
    results.push(agg);
  }
  return results;
}
