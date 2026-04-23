import {
  analyzeDirectory,
  analyzeDirectoryCached,
  defaultClaudeLogDir,
  formatDuration,
  formatUsd,
  loadConfig,
  parseSince,
  type SessionAggregate,
} from "@kojihq/core";
import { openCacheDb } from "@kojihq/core/db";

export interface SessionsOptions {
  since: string;
  limit: string;
  dir?: string;
  cache: boolean;
}

export async function sessionsCommand(opts: SessionsOptions): Promise<void> {
  const cfg = loadConfig();
  const dir = opts.dir ?? cfg.logDir ?? defaultClaudeLogDir();
  const since = parseSince(opts.since);

  let all: SessionAggregate[];
  if (opts.cache === false) {
    all = await analyzeDirectory(dir, { since });
  } else {
    const cache = openCacheDb();
    try {
      all = await analyzeDirectoryCached(dir, cache.db, { since });
    } finally {
      cache.close();
    }
  }

  const aggs = all.filter((a) => a.assistantTurns > 0 || a.userTurns > 0);
  const limit = Number(opts.limit);

  aggs.sort((a, b) => (b.endedAt ?? "").localeCompare(a.endedAt ?? ""));

  if (aggs.length === 0) {
    console.log(`No active sessions under ${dir} since ${since.toISOString()}.`);
    return;
  }

  const shown = aggs.slice(0, limit);
  for (const a of shown) {
    const ended = a.endedAt ?? "-";
    const dur = formatDuration(a.durationMs);
    const cost = formatUsd(a.costUsd);
    const tools = Object.keys(a.tools).length;
    console.log(
      `${a.sessionId}  ${ended}  duration=${dur}  cost=${cost}  turns=${a.assistantTurns}a/${a.userTurns}u  tools=${tools}`,
    );
  }
  if (aggs.length > limit) {
    console.log(`... (${aggs.length - limit} more; use --limit to show more)`);
  }
}
