import {
  writeFileSync,
  mkdirSync,
  renameSync,
  existsSync,
  readFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import path from "node:path";
import {
  defaultClaudeLogDir,
  normalizeDirArg,
  collectAuditEvents,
  detectAuditAnomalies,
  formatAuditExplain,
  parseSince,
  formatAuditEventText,
  formatAuditEventsJson,
  readAuditState,
  writeAuditState,
  type AuditCategory,
  type AuditEvent,
} from "@kojihq/core";
import {
  collectAuditEventsCached,
  openCacheDb,
} from "@kojihq/core-sqlite";

interface AuditOptions {
  dir?: string;
  since?: string;
  category?: string;
  tool?: string;
  format?: string;
  out?: string;
  sync?: boolean;
  learnMcp?: boolean;
  explain?: boolean;
  raw?: boolean;
  cache?: boolean;
}

const AUTH_DIR = path.join(homedir(), ".koji-lens");
const AUTH_FILE = path.join(AUTH_DIR, "auth.json");
const SYNC_BATCH_SIZE = 100;
const SYNC_MAX_RETRIES = 3;

interface AuthFile {
  token: string;
  clerkUserId: string;
  expiresAt: number;
  baseUrl: string;
  loggedInAt: number;
}

interface AuditEventPayload {
  id: string;
  session_id: string;
  event_timestamp: string;
  tool_name: string;
  category: AuditCategory;
  target: string | null;
  input_json: string | null;
}

function loadAuth(): AuthFile {
  if (!existsSync(AUTH_FILE)) {
    throw new Error(
      `認証情報が見つかりません。\`koji-lens login\` を実行してください。\n(期待パス: ${AUTH_FILE})`,
    );
  }
  const raw = readFileSync(AUTH_FILE, "utf8");
  const auth = JSON.parse(raw) as AuthFile;
  if (auth.expiresAt < Date.now()) {
    throw new Error(
      "認証情報の有効期限が切れました。`koji-lens login` で再認証してください。",
    );
  }
  return auth;
}

function buildEventId(e: AuditEvent): string {
  // 同一 (sessionId + timestamp + toolName) は server 側 unique key で重複排除
  // (target は同一 tool で複数あり得るので id 生成には含まない、index 用 hash)
  const hash = createHash("sha256");
  hash.update(`${e.sessionId}:${e.timestamp}:${e.toolName}`);
  return hash.digest("hex").slice(0, 32);
}

function toPayload(e: AuditEvent): AuditEventPayload {
  return {
    id: buildEventId(e),
    session_id: e.sessionId,
    event_timestamp: e.timestamp,
    tool_name: e.toolName,
    category: e.category,
    target: e.target,
    input_json: JSON.stringify(e.input),
  };
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface AuditSyncResponse {
  inserted: number;
  total: number;
  dedup: number;
  validation_errors: string[];
}

async function postAuditBatch(
  baseUrl: string,
  token: string,
  events: AuditEventPayload[],
): Promise<AuditSyncResponse> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < SYNC_MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(`${baseUrl}/api/audit/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ events }),
      });
      if (res.ok) {
        return (await res.json()) as AuditSyncResponse;
      }
      if (res.status === 401 || res.status === 410) {
        throw new Error(
          "認証情報が無効/期限切れです。`koji-lens login` で再認証してください。",
        );
      }
      if (res.status === 403) {
        throw new Error(
          "Pro 機能アクセス権限がありません。GA 後は Pro プランへのアップグレードが必要です。",
        );
      }
      lastErr = new Error(`HTTP ${res.status}: ${await res.text()}`);
    } catch (err) {
      lastErr = err;
    }
    const delay = 1000 * Math.pow(2, attempt);
    if (attempt < SYNC_MAX_RETRIES - 1) {
      console.warn(
        `[audit/sync] バッチ送信に失敗 (試行 ${attempt + 1}/${SYNC_MAX_RETRIES})、${delay / 1000}s 後にリトライ...`,
      );
      await sleep(delay);
    }
  }
  throw lastErr ?? new Error("Unknown audit sync error");
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

  // 2026-05-17 改善案 A: SQLite cache 経路 (--no-cache で skip)
  // cache hit 効果 -75-88% (4 秒 → 500ms-1 sec、5/17 計測ベース)
  let events: AuditEvent[];
  if (opts.cache === false) {
    events = collectAuditEvents(dir, {
      sinceMs,
      category,
      tool: opts.tool,
      raw: opts.raw,
    });
  } else {
    const cache = openCacheDb();
    try {
      events = collectAuditEventsCached(dir, cache.db, {
        sinceMs,
        category,
        tool: opts.tool,
        raw: opts.raw,
      });
    } finally {
      cache.close();
    }
  }

  // --explain: 段階 6 異常検知の警告 → 解消サイクル化 (2026-05-17 案 B 候補 4-d、オーナー指摘採用)
  // 警告検出時に「次に何すべきか」を CLI で直接提示、memory `feedback_implementation_vs_proof.md`
  // 整合の「警告出すだけ」状態を解消
  if (opts.explain) {
    const state = readAuditState();
    const signal = detectAuditAnomalies(events, {
      knownMcpServers: state.knownMcpServers,
    });
    process.stdout.write(formatAuditExplain(signal, events));
    return;
  }

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

  // --sync: Pro cloud sync 本実装 (5/16 セッション継続 16、案 E 段階 7 本実装)
  // POST /api/audit/sync (Bearer auth + batch 100 + retry 3) で audit_events table に upsert
  // 設計詳細: ai-company/operations/projects/koji-lens/notes/2026-05-16-audit-sync-design-v0.1.md
  if (opts.sync) {
    if (events.length === 0) {
      console.log("[audit/sync] No events to sync.");
      return;
    }

    const auth = loadAuth();
    const anomalies = detectAuditAnomalies(events, {
      knownMcpServers: readAuditState().knownMcpServers,
    });

    console.log(
      `[audit/sync] ${events.length} events を ${SYNC_BATCH_SIZE} 件/batch で送信中... (severity=${anomalies.severity})`,
    );

    const payloads = events.map(toPayload);
    let totalInserted = 0;
    let totalDedup = 0;
    const allValidationErrors: string[] = [];

    for (let i = 0; i < payloads.length; i += SYNC_BATCH_SIZE) {
      const batch = payloads.slice(i, i + SYNC_BATCH_SIZE);
      const res = await postAuditBatch(auth.baseUrl, auth.token, batch);
      totalInserted += res.inserted;
      totalDedup += res.dedup;
      allValidationErrors.push(...res.validation_errors);
      console.log(
        `[audit/sync]  batch ${Math.floor(i / SYNC_BATCH_SIZE) + 1}/${Math.ceil(payloads.length / SYNC_BATCH_SIZE)}: inserted=${res.inserted}, dedup=${res.dedup}, total=${res.total}`,
      );
    }

    console.log(
      `[audit/sync] 完了: ${totalInserted} 件新規挿入, ${totalDedup} 件重複スキップ, ${allValidationErrors.length} 件 validation エラー (合計 ${events.length} 件処理)`,
    );

    if (allValidationErrors.length > 0) {
      console.warn("[audit/sync] validation エラー詳細:");
      for (const err of allValidationErrors.slice(0, 5)) {
        console.warn(`  - ${err}`);
      }
      if (allValidationErrors.length > 5) {
        console.warn(`  ... and ${allValidationErrors.length - 5} more`);
      }
    }

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
