import { writeFileSync, mkdirSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import {
  defaultClaudeLogDir,
  normalizeDirArg,
  collectAuditEvents,
  detectAuditAnomalies,
  parseSince,
  formatAuditEventText,
  formatAuditEventsJson,
  readAuditState,
  writeAuditState,
  type AuditCategory,
} from "@kojihq/core";

interface AuditOptions {
  dir?: string;
  since?: string;
  category?: string;
  tool?: string;
  format?: string;
  out?: string;
  sync?: boolean;
  learnMcp?: boolean;
}

const VALID_CATEGORIES: AuditCategory[] = [
  "fs-read",
  "fs-write",
  "exec",
  "fetch",
  "task",
  "mcp",
  "other",
];

export async function auditCommand(opts: AuditOptions): Promise<void> {
  const dir = opts.dir ? normalizeDirArg(opts.dir) : defaultClaudeLogDir();
  const sinceMs = opts.since ? parseSince(opts.since).getTime() : undefined;

  let category: AuditCategory | undefined;
  if (opts.category) {
    if (!VALID_CATEGORIES.includes(opts.category as AuditCategory)) {
      throw new Error(
        `Invalid --category: ${opts.category}. Valid: ${VALID_CATEGORIES.join(", ")}`,
      );
    }
    category = opts.category as AuditCategory;
  }

  const events = collectAuditEvents(dir, {
    sinceMs,
    category,
    tool: opts.tool,
  });

  // --learn-mcp: 検出された MCP server を knownMcpServers に追加 (statusline ⚠ 消去用)
  if (opts.learnMcp) {
    const state = readAuditState();
    const seen = new Set(state.knownMcpServers);
    let added = 0;
    for (const e of events) {
      if (e.category !== "mcp") continue;
      const rest = e.toolName.slice(5);
      const idx = rest.indexOf("__");
      const server = idx > 0 ? rest.slice(0, idx) : rest;
      if (!seen.has(server)) {
        seen.add(server);
        added += 1;
      }
    }
    writeAuditState({
      knownMcpServers: Array.from(seen).sort(),
      lastChecked: Date.now(),
      version: 1,
    });
    console.log(`Learned ${added} new MCP server(s). Total known: ${seen.size}.`);
    return;
  }

  // --sync: Pro cloud sync stub (Phase B 6/01-6/14 で本実装、設計ドラフト v0.1 整合)
  // 現状: warning メッセージのみ、実装は Phase B 期間で
  // ai-company/operations/projects/koji-lens/notes/2026-05-16-audit-sync-design-v0.1.md
  // 整合の POST /api/audit/sync 経由で audit_events table に upsert
  if (opts.sync) {
    const anomalies = detectAuditAnomalies(events, {
      knownMcpServers: readAuditState().knownMcpServers,
    });
    console.error(
      "[koji-lens audit --sync] Phase B 6/01-6/14 で本実装予定 (Pro cloud sync stub)。",
    );
    console.error(
      `[koji-lens audit --sync] 現状 ${events.length} events, severity=${anomalies.severity}.`,
    );
    console.error(
      "[koji-lens audit --sync] 設計詳細: operations/projects/koji-lens/notes/2026-05-16-audit-sync-design-v0.1.md",
    );
    return;
  }

  const format = opts.format ?? "text";
  if (format !== "text" && format !== "json") {
    throw new Error(`Invalid --format: ${format}. Valid: text, json`);
  }

  let output: string;
  if (format === "json") {
    output = formatAuditEventsJson(events);
  } else {
    if (events.length === 0) {
      output = "No audit events found for the given filters.";
    } else {
      const header =
        "timestamp                     category  tool                  target";
      const rule = "-".repeat(header.length);
      output = [header, rule, ...events.map(formatAuditEventText)].join("\n");
    }
  }

  if (opts.out) {
    const outPath = opts.out.startsWith("~/")
      ? join(homedir(), opts.out.slice(2))
      : opts.out;
    mkdirSync(dirname(outPath), { recursive: true });
    const tmp = `${outPath}.tmp`;
    writeFileSync(tmp, output, "utf-8");
    renameSync(tmp, outPath);
    console.log(`Wrote ${events.length} events to ${outPath}`);
  } else {
    process.stdout.write(output + "\n");
  }
}
