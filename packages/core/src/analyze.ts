import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import {
  applyRecord,
  createEmptyAggregate,
  finalizeAggregate,
  type SessionAggregate,
} from "./aggregate.js";
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
