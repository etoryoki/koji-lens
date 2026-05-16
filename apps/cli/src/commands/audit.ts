import { writeFileSync, mkdirSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import {
  defaultClaudeLogDir,
  normalizeDirArg,
  collectAuditEvents,
  parseSince,
  formatAuditEventText,
  formatAuditEventsJson,
  type AuditCategory,
} from "@kojihq/core";

interface AuditOptions {
  dir?: string;
  since?: string;
  category?: string;
  tool?: string;
  format?: string;
  out?: string;
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
