import { writeFileSync } from "node:fs";
import {
  analyzeDirectory,
  defaultClaudeLogDir,
  loadConfig,
  parseSince,
  type SessionAggregate,
} from "@kojihq/core";
import { analyzeDirectoryCached, openCacheDb } from "@kojihq/core-sqlite";

export interface ExportOptions {
  since: string;
  format: string;
  dir?: string;
  cache: boolean;
  output?: string;
}

const VALID_FORMATS = ["csv", "json"] as const;
type ExportFormat = (typeof VALID_FORMATS)[number];

function parseFormat(input: string): ExportFormat {
  if ((VALID_FORMATS as ReadonlyArray<string>).includes(input)) {
    return input as ExportFormat;
  }
  throw new Error(
    `Invalid --format: "${input}". Expected: ${VALID_FORMATS.join(", ")}`,
  );
}

const CSV_COLUMNS = [
  "sessionId",
  "filePath",
  "startedAt",
  "endedAt",
  "durationMs",
  "assistantTurns",
  "userTurns",
  "sidechainCount",
  "inputTokens",
  "outputTokens",
  "cacheReadTokens",
  "cacheCreateTokens",
  "costUsd",
  "models",
  "tools",
  "modelChanges",
  "latencyP50Ms",
  "latencyP95Ms",
] as const;

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function aggToCsvRow(a: SessionAggregate): string {
  const cells = [
    a.sessionId,
    a.filePath,
    a.startedAt ?? "",
    a.endedAt ?? "",
    String(a.durationMs),
    String(a.assistantTurns),
    String(a.userTurns),
    String(a.sidechainCount),
    String(a.inputTokens),
    String(a.outputTokens),
    String(a.cacheReadTokens),
    String(a.cacheCreateTokens),
    a.costUsd.toFixed(6),
    JSON.stringify(a.models),
    JSON.stringify(a.tools),
    JSON.stringify(a.modelChanges),
    String(a.latencyP50Ms),
    String(a.latencyP95Ms),
  ];
  return cells.map(csvEscape).join(",");
}

function renderCsv(aggs: SessionAggregate[]): string {
  const lines: string[] = [];
  lines.push(CSV_COLUMNS.join(","));
  for (const a of aggs) lines.push(aggToCsvRow(a));
  return lines.join("\n") + "\n";
}

function renderJson(aggs: SessionAggregate[]): string {
  return (
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        count: aggs.length,
        sessions: aggs,
      },
      null,
      2,
    ) + "\n"
  );
}

export async function exportCommand(opts: ExportOptions): Promise<void> {
  const cfg = loadConfig();
  const dir = opts.dir ?? cfg.logDir ?? defaultClaudeLogDir();
  const format = parseFormat(opts.format);

  const sinceDate = parseSince(opts.since);
  const sinceIso = sinceDate?.toISOString();

  let all: SessionAggregate[];
  if (opts.cache === false) {
    all = await analyzeDirectory(dir);
  } else {
    const cache = openCacheDb();
    try {
      all = await analyzeDirectoryCached(dir, cache.db);
    } finally {
      cache.close();
    }
  }

  const filtered = sinceIso
    ? all.filter((a) => (a.endedAt ?? a.startedAt ?? "") >= sinceIso)
    : all;
  const sorted = [...filtered].sort((a, b) =>
    (b.endedAt ?? "").localeCompare(a.endedAt ?? ""),
  );

  const output = format === "csv" ? renderCsv(sorted) : renderJson(sorted);

  if (opts.output) {
    writeFileSync(opts.output, output, "utf8");
    process.stdout.write(
      `Exported ${sorted.length} session(s) to ${opts.output} (${format})\n`,
    );
  } else {
    process.stdout.write(output);
  }
}
