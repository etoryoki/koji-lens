import { readFileSync } from "node:fs";
import { findJsonlFiles, sessionIdFromPath } from "./paths.js";
import { parseRecord, type ClaudeCodeRecord } from "./schema.js";

/**
 * Audit log: Claude Code session の tool_use 履歴を category 別に抽出する。
 *
 * 5/16 Koji 3 つ目サービス戦略メモ v0.1 整合 (`ceo/strategy/2026-05-16-koji-third-service-strategic-memo-v0.1.md`):
 * 案 E (Audit log + アクセス監視) を koji-lens Pro 機能拡張として Phase B (5/22-6/14) 組み込み、
 * 深町 CTO 諮問推奨「sessions.jsonl の tool_use 記録抽出 = filesystem read/write + exec パターン」
 * 整合の Phase 0 実装。本日 5/16 セッション継続で Phase B 着手前に先取り段階 1-5 実装。
 *
 * 5/22 Phase B 後半で statusline 異常検知 + Pro cloud sync opt-in 追加予定 (段階 6-7)。
 */

export type AuditCategory =
  | "fs-read"
  | "fs-write"
  | "exec"
  | "fetch"
  | "task"
  | "mcp"
  | "other";

export interface AuditEvent {
  sessionId: string;
  timestamp: string;
  toolName: string;
  category: AuditCategory;
  target: string | null;
  input: Record<string, unknown>;
}

const FS_READ_TOOLS = new Set([
  "Read",
  "Glob",
  "Grep",
  "NotebookRead",
  "ReadMcpResourceTool",
  "ListMcpResourcesTool",
]);
const FS_WRITE_TOOLS = new Set(["Write", "Edit", "NotebookEdit"]);
const EXEC_TOOLS = new Set(["Bash", "PowerShell"]);
const FETCH_TOOLS = new Set(["WebFetch", "WebSearch"]);
const TASK_TOOLS = new Set([
  "Task",
  "Agent",
  "TaskCreate",
  "TaskUpdate",
  "TaskList",
  "TaskGet",
  "TaskStop",
  "TaskOutput",
]);

export function classifyTool(toolName: string): AuditCategory {
  if (toolName.startsWith("mcp__")) return "mcp";
  if (FS_READ_TOOLS.has(toolName)) return "fs-read";
  if (FS_WRITE_TOOLS.has(toolName)) return "fs-write";
  if (EXEC_TOOLS.has(toolName)) return "exec";
  if (FETCH_TOOLS.has(toolName)) return "fetch";
  if (TASK_TOOLS.has(toolName)) return "task";
  return "other";
}

export function extractTarget(
  category: AuditCategory,
  input: Record<string, unknown>,
): string | null {
  switch (category) {
    case "fs-read":
    case "fs-write": {
      const path =
        input.file_path ?? input.path ?? input.notebook_path ?? input.pattern;
      return typeof path === "string" ? path : null;
    }
    case "exec": {
      const cmd = input.command;
      return typeof cmd === "string" ? cmd : null;
    }
    case "fetch": {
      const url = input.url ?? input.query;
      return typeof url === "string" ? url : null;
    }
    case "task": {
      const sub =
        input.subagent_type ?? input.description ?? input.subject;
      return typeof sub === "string" ? sub : null;
    }
    case "mcp":
    case "other":
      return null;
  }
}

export function extractAuditEvents(rec: ClaudeCodeRecord): AuditEvent[] {
  if (rec.type !== "assistant") return [];
  if (!rec.timestamp) return [];
  if (!rec.message?.content) return [];
  const sessionId = rec.sessionId ?? "";
  const events: AuditEvent[] = [];
  for (const c of rec.message.content) {
    if (c.type !== "tool_use" || typeof c.name !== "string") continue;
    const toolName = c.name;
    const input =
      ((c as unknown as Record<string, unknown>).input as
        | Record<string, unknown>
        | undefined) ?? {};
    const category = classifyTool(toolName);
    const target = extractTarget(category, input);
    events.push({
      sessionId,
      timestamp: rec.timestamp,
      toolName,
      category,
      target,
      input,
    });
  }
  return events;
}

export interface AuditFilterOptions {
  sinceMs?: number;
  category?: AuditCategory;
  tool?: string;
}

export function filterAuditEvents(
  events: AuditEvent[],
  opts: AuditFilterOptions,
): AuditEvent[] {
  return events.filter((e) => {
    if (opts.sinceMs !== undefined) {
      const t = new Date(e.timestamp).getTime();
      if (t < opts.sinceMs) return false;
    }
    if (opts.category && e.category !== opts.category) return false;
    if (opts.tool && e.toolName !== opts.tool) return false;
    return true;
  });
}

export function collectAuditEvents(
  rootDir: string,
  opts: AuditFilterOptions = {},
): AuditEvent[] {
  const files = findJsonlFiles(rootDir);
  const events: AuditEvent[] = [];
  for (const file of files) {
    let content: string;
    try {
      content = readFileSync(file, "utf-8");
    } catch {
      continue;
    }
    const fallbackSessionId = sessionIdFromPath(file);
    for (const line of content.split("\n")) {
      const rec = parseRecord(line);
      if (!rec) continue;
      const augmented: ClaudeCodeRecord = rec.sessionId
        ? rec
        : { ...rec, sessionId: fallbackSessionId };
      events.push(...extractAuditEvents(augmented));
    }
  }
  return filterAuditEvents(events, opts);
}

/**
 * 段階 6 異常検知: audit events から異常パターンを抽出。
 *
 * - 新規 MCP server: knownMcpServers に含まれない mcp__<server>__* を検出
 * - 高頻度 exec: 24h で exec カテゴリが highFreqExecThreshold 件超過
 * - 巨大 fs-write: target が .env / secrets / credentials を含む fs-write
 */

export interface AuditAnomalyOptions {
  knownMcpServers?: string[];
  highFreqExecThreshold?: number;
}

export interface AuditAnomalySignal {
  newMcpServers: string[];
  execCount: number;
  highFreqExec: boolean;
  sensitiveWrites: string[];
  severity: "ok" | "warning" | "critical";
}

const SENSITIVE_WRITE_PATTERNS = [
  /\.env(\.|$)/i,
  /credentials?/i,
  /secrets?/i,
  /private[_-]?key/i,
  /\.pem$/i,
  /\.ppk$/i,
];

export function detectAuditAnomalies(
  events: AuditEvent[],
  opts: AuditAnomalyOptions = {},
): AuditAnomalySignal {
  const known = new Set(opts.knownMcpServers ?? []);
  const threshold = opts.highFreqExecThreshold ?? 200;

  const newMcpServersSet = new Set<string>();
  let execCount = 0;
  const sensitiveWrites: string[] = [];

  for (const e of events) {
    if (e.category === "mcp") {
      const rest = e.toolName.slice(5);
      const idx = rest.indexOf("__");
      const server = idx > 0 ? rest.slice(0, idx) : rest;
      if (!known.has(server)) newMcpServersSet.add(server);
    } else if (e.category === "exec") {
      execCount += 1;
    } else if (e.category === "fs-write" && e.target) {
      if (SENSITIVE_WRITE_PATTERNS.some((p) => p.test(e.target ?? ""))) {
        sensitiveWrites.push(e.target);
      }
    }
  }

  const highFreqExec = execCount > threshold;
  const newMcpServers = Array.from(newMcpServersSet).sort();

  let severity: "ok" | "warning" | "critical" = "ok";
  if (sensitiveWrites.length > 0) {
    severity = "critical";
  } else if (newMcpServers.length > 0 || highFreqExec) {
    severity = "warning";
  }

  return {
    newMcpServers,
    execCount,
    highFreqExec,
    sensitiveWrites,
    severity,
  };
}

export function formatAuditEventText(e: AuditEvent): string {
  const ts = new Date(e.timestamp).toISOString();
  const cat = e.category.padEnd(8);
  const tool = e.toolName.padEnd(20);
  const target = e.target ?? "";
  return `${ts}  ${cat}  ${tool}  ${target}`;
}

export function formatAuditEventsJson(events: AuditEvent[]): string {
  return JSON.stringify(events, null, 2);
}
