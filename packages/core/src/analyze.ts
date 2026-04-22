import { createReadStream, statSync } from "node:fs";
import { createInterface } from "node:readline";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import {
  applyRecord,
  createEmptyAggregate,
  finalizeAggregate,
  type SessionAggregate,
} from "./aggregate.js";
import {
  getSessionCache,
  isCacheFresh,
  upsertSessionCache,
} from "./db/cache.js";
import { findJsonlFiles, sessionIdFromPath } from "./paths.js";
import { parseRecord } from "./schema.js";

export interface AnalyzeOptions {
  since?: Date;
}

export async function analyzeFile(
  filePath: string,
  opts: AnalyzeOptions = {},
): Promise<SessionAggregate> {
  const sessionId = sessionIdFromPath(filePath);
  const agg = createEmptyAggregate(sessionId, filePath);
  const stream = createReadStream(filePath, { encoding: "utf8" });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of rl) {
    const rec = parseRecord(line);
    if (!rec) continue;
    if (opts.since && rec.timestamp) {
      if (new Date(rec.timestamp) < opts.since) continue;
    }
    applyRecord(agg, rec);
  }
  return finalizeAggregate(agg);
}

export async function analyzeDirectory(
  rootDir: string,
  opts: AnalyzeOptions = {},
): Promise<SessionAggregate[]> {
  const files = findJsonlFiles(rootDir);
  const results: SessionAggregate[] = [];
  for (const f of files) {
    results.push(await analyzeFile(f, opts));
  }
  return results;
}

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

    let agg: SessionAggregate | null = null;
    if (isCacheFresh(db, sessionId, mtimeMs)) {
      const cached = getSessionCache(db, sessionId);
      if (cached) {
        agg = cached;
        opts.onHit?.(sessionId);
      }
    }
    if (!agg) {
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

export function parseSince(expr: string, now: Date = new Date()): Date {
  const trimmed = expr.trim();
  const m = /^(\d+)([hdw])$/.exec(trimmed);
  if (m) {
    const n = Number(m[1]);
    const unit = m[2];
    const ms =
      unit === "h" ? n * 3_600_000 : unit === "d" ? n * 86_400_000 : n * 604_800_000;
    return new Date(now.getTime() - ms);
  }
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) {
    throw new Error(
      `Invalid --since value: ${expr}. Use "24h" / "7d" / "2w" or ISO date like "2026-04-01".`,
    );
  }
  return d;
}
