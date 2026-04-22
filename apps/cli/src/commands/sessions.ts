import {
  analyzeDirectory,
  defaultClaudeLogDir,
  formatDuration,
  formatUsd,
  loadConfig,
  parseSince,
} from "@kojihq/core";

export interface SessionsOptions {
  since: string;
  limit: string;
  dir?: string;
}

export async function sessionsCommand(opts: SessionsOptions): Promise<void> {
  const cfg = loadConfig();
  const dir = opts.dir ?? cfg.logDir ?? defaultClaudeLogDir();
  const since = parseSince(opts.since);
  const all = await analyzeDirectory(dir, { since });
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
