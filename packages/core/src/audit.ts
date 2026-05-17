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

/**
 * PII redaction patterns (5/16 戦略メモ v0.3 §0.6 発見 3 + 設計ドラフト v0.1 §6 B.1 整合)
 *
 * Anthropic 公式 (`anthropic.com/engineering/code-execution-with-mcp`) は agent 側で PII
 * tokenization (`[EMAIL_1]` / `[PHONE_1]` 等) を自動化、model context 漏れ防止。
 * 案 E (audit log) は tool_use 記録時の input field に PII 含む可能性 = MVP 組み込み必須。
 *
 * トレードオフ:
 * - False positive: legitimate な UUID / API テストキー等が redaction される
 * - False negative: 国際電話番号 / 特殊形式 API キー等が redaction 漏れ
 * - 採用 = 既知パターン redaction + CLI --raw フラグでデバッグ用無効化
 */

/**
 * 評価順序は specific → general、長い数値 pattern を短い pattern より先に。
 * 例: Credit card (16 digits) を Phone JP (10-12 digits) より先に評価。
 */
const REDACTION_PATTERNS: Array<{ regex: RegExp; replacement: string }> = [
  // Email (RFC 5322 simplified)
  {
    regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    replacement: "[EMAIL]",
  },
  // UUID (specific format, evaluated early)
  {
    regex: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
    replacement: "[UUID]",
  },
  // JWT (header.payload.signature in base64url) — eyJ で始まる JSON header の base64
  {
    regex: /\beyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/g,
    replacement: "[JWT]",
  },
  // AWS Access Key ID (AKIA prefix + 16 chars uppercase alphanumeric)
  { regex: /\bAKIA[0-9A-Z]{16}\b/g, replacement: "[AWS_KEY]" },
  // GitHub Personal Access Token (ghp_/gho_/ghu_/ghs_/ghr_ prefix + 36+ chars)
  {
    regex: /\bgh[pousr]_[A-Za-z0-9_]{36,}\b/g,
    replacement: "[GITHUB_TOKEN]",
  },
  // Slack incoming webhook URL
  {
    regex: /https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[A-Za-z0-9]+/g,
    replacement: "[SLACK_WEBHOOK]",
  },
  // Stripe-style API keys (specific prefix)
  {
    regex: /\b(?:sk|pk)_(?:live|test)_[a-zA-Z0-9]{24,}\b/g,
    replacement: "[API_KEY]",
  },
  // Bearer tokens (specific prefix)
  { regex: /Bearer\s+[a-zA-Z0-9._-]{20,}/g, replacement: "Bearer [TOKEN]" },
  // Credit card (Visa/MC/Amex, 16 digits with separators) — Phone より先に評価
  {
    regex: /\b\d{4}[-\s]\d{4}[-\s]\d{4}[-\s]\d{4}\b/g,
    replacement: "[CARD]",
  },
  // Phone US (+1 optional + 10 digits)
  {
    regex: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    replacement: "[PHONE_US]",
  },
  // Phone JP (XXX-XXXX-XXXX or XX-XXXX-XXXX hyphen-separated)
  { regex: /\b\d{2,4}-\d{2,4}-\d{4}\b/g, replacement: "[PHONE_JP]" },
];

export function redactString(s: string): string {
  let result = s;
  for (const { regex, replacement } of REDACTION_PATTERNS) {
    result = result.replace(regex, replacement);
  }
  return result;
}

/**
 * input オブジェクトを再帰的に walk、文字列値に PII redaction を適用。
 * オリジナルオブジェクトは変更せず、redaction 済の新オブジェクトを返す。
 */
export function redactSensitiveInput(
  input: Record<string, unknown>,
): Record<string, unknown> {
  function redactRecursive(v: unknown): unknown {
    if (typeof v === "string") return redactString(v);
    if (Array.isArray(v)) return v.map(redactRecursive);
    if (v && typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        out[k] = redactRecursive(val);
      }
      return out;
    }
    return v;
  }
  return redactRecursive(input) as Record<string, unknown>;
}

export interface ExtractOptions {
  /**
   * false なら input field に PII redaction 適用 (default: false = redaction ON)
   * CLI --raw フラグで true 指定可能 (デバッグ用)
   */
  raw?: boolean;
}

export function extractAuditEvents(
  rec: ClaudeCodeRecord,
  opts: ExtractOptions = {},
): AuditEvent[] {
  if (rec.type !== "assistant") return [];
  if (!rec.timestamp) return [];
  if (!rec.message?.content) return [];
  const sessionId = rec.sessionId ?? "";
  const events: AuditEvent[] = [];
  for (const c of rec.message.content) {
    if (c.type !== "tool_use" || typeof c.name !== "string") continue;
    const toolName = c.name;
    const rawInput =
      ((c as unknown as Record<string, unknown>).input as
        | Record<string, unknown>
        | undefined) ?? {};
    const category = classifyTool(toolName);
    // target は raw input から抽出後、--raw でない限り redaction 適用
    // (command field に email / API key 等含む可能性、5/16 v0.3 設計拡張)
    const rawTarget = extractTarget(category, rawInput);
    const target = opts.raw || rawTarget === null
      ? rawTarget
      : redactString(rawTarget);
    // input field は redaction 適用 (--raw 指定時のみ raw 保持)
    const input = opts.raw ? rawInput : redactSensitiveInput(rawInput);
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

export interface CollectAuditOptions extends AuditFilterOptions, ExtractOptions {}

export function collectAuditEvents(
  rootDir: string,
  opts: CollectAuditOptions = {},
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
      events.push(...extractAuditEvents(augmented, { raw: opts.raw }));
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

/**
 * 段階 6 異常検知の警告 → 解消サイクル化 (2026-05-17 案 B 候補 4-d、オーナー指摘採用)
 *
 * 警告検出時に「次に何すべきか」を直接提示。memory `feedback_implementation_vs_proof.md`
 * 整合の「警告出すだけ」状態を解消、ユーザー対処経路明示。
 *
 * 戻り値 = severity 別の人間可読 hint テキスト (CLI 表示用、複数行)
 */
export function formatAuditExplain(
  signal: AuditAnomalySignal,
  events: AuditEvent[],
): string {
  if (signal.severity === "ok") {
    return "audit anomaly signal: ok (no warnings).\n";
  }

  const lines: string[] = [];

  if (signal.sensitiveWrites.length > 0) {
    lines.push(
      `🛡 機密ファイル書き込み検出 (sensitive=${signal.sensitiveWrites.length})`,
    );
    lines.push("   検出ファイル:");
    for (const path of signal.sensitiveWrites.slice(0, 10)) {
      lines.push(`     - ${path}`);
    }
    if (signal.sensitiveWrites.length > 10) {
      lines.push(`     ... ${signal.sensitiveWrites.length - 10} 件省略`);
    }
    lines.push("   推奨対処:");
    lines.push(
      "     1. 意図的なファイルなら → .gitignore 追加で commit 漏れ防止",
    );
    lines.push(
      "     2. シークレット値が hardcode なら → 環境変数化 (export ENV_VAR=...)",
    );
    lines.push(
      "     3. 誤検出なら → false positive 報告: github.com/etoryoki/koji-lens/issues",
    );
    lines.push("");
  }

  if (signal.highFreqExec) {
    lines.push(
      `⚠ 高頻度 exec 検出 (exec=${signal.execCount} > 200 threshold)`,
    );
    const topBash = collectTopExecCommands(events, 5);
    if (topBash.length > 0) {
      lines.push("   上位 Bash command (頻度順):");
      for (const { cmd, count } of topBash) {
        lines.push(`     - ${cmd} (${count} 回)`);
      }
    }
    lines.push("   推奨対処:");
    lines.push("     1. 同一 command 連発 → script 化検討 (`bin/check.sh` 等)");
    lines.push(
      "     2. 集計目的 → koji-lens tools / summary で代替可能か検討",
    );
    lines.push(
      "     3. 閾値が低すぎる → koji-lens config に audit.execThreshold 設定追加",
    );
    lines.push("");
  }

  if (signal.newMcpServers.length > 0) {
    lines.push(
      `⚠ 新規 MCP server 検出 (+${signal.newMcpServers.length}mcp = ${signal.newMcpServers.join(", ")})`,
    );
    lines.push("   推奨対処:");
    lines.push(
      "     1. 意図的に導入 → koji-lens audit --learn-mcp で学習 (警告消去)",
    );
    lines.push("     2. 意図的でない → MCP server 削除確認");
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * exec カテゴリ events から Bash command 上位 N 件を頻度順で抽出。
 * formatAuditExplain の高頻度 exec hint 用 helper。
 */
function collectTopExecCommands(
  events: AuditEvent[],
  topN: number,
): Array<{ cmd: string; count: number }> {
  const counts = new Map<string, number>();
  for (const e of events) {
    if (e.category === "exec" && e.target) {
      // truncate 80 chars for readability
      const cmd =
        e.target.length > 80 ? e.target.slice(0, 77) + "..." : e.target;
      counts.set(cmd, (counts.get(cmd) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, topN)
    .map(([cmd, count]) => ({ cmd, count }));
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
