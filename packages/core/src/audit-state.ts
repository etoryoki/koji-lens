import { readFileSync, writeFileSync, mkdirSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

/**
 * audit-state.ts: ~/.koji-lens/audit-state.json で audit 既知状態を persistent 管理。
 *
 * 段階 6 (statusline 異常検知) で「新規 MCP server 検出」のために、これまでに承認済の
 * MCP server リストを保持。新規発見時に statusline で ⚠ icon 表示、ユーザーが
 * `koji-lens audit --learn-mcp` 実行で known set に追加 = ⚠ 消去。
 *
 * 5/16 案 E 段階 6 実装、戦略メモ v0.1 整合
 * (`ai-company/ceo/strategy/2026-05-16-koji-third-service-strategic-memo-v0.1.md`)。
 */

export interface AuditState {
  knownMcpServers: string[];
  lastChecked: number;
  version: 1;
}

export function defaultAuditStatePath(): string {
  return join(homedir(), ".koji-lens", "audit-state.json");
}

const EMPTY_STATE: AuditState = {
  knownMcpServers: [],
  lastChecked: 0,
  version: 1,
};

export function readAuditState(filePath: string = defaultAuditStatePath()): AuditState {
  try {
    const raw = readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<AuditState>;
    if (parsed && Array.isArray(parsed.knownMcpServers)) {
      return {
        knownMcpServers: parsed.knownMcpServers.filter(
          (s) => typeof s === "string",
        ),
        lastChecked: typeof parsed.lastChecked === "number" ? parsed.lastChecked : 0,
        version: 1,
      };
    }
  } catch {
    // ファイル不在 or 不正 = 空 state
  }
  return { ...EMPTY_STATE };
}

export function writeAuditState(
  state: AuditState,
  filePath: string = defaultAuditStatePath(),
): void {
  mkdirSync(dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp`;
  writeFileSync(tmp, JSON.stringify(state, null, 2), "utf-8");
  renameSync(tmp, filePath);
}

/**
 * mcp__<server>__<method> 形式の tool name から server 名を抽出。
 * 例: "mcp__github__create_pull_request" → "github"
 */
export function extractMcpServerName(toolName: string): string | null {
  if (!toolName.startsWith("mcp__")) return null;
  const rest = toolName.slice(5); // strip "mcp__"
  const idx = rest.indexOf("__");
  return idx > 0 ? rest.slice(0, idx) : rest;
}

/**
 * audit-rules.json (ユーザーカスタム alert rules 永続化)
 * 2026-05-19 v0.2 新規追加 (案 1 Alert rule カスタマイズ、深町諮問 7 件採用 #1)
 *
 * パス: ~/.koji-lens/audit-rules.json
 * audit-state.json と別ファイル管理 (state = 動的、rules = ユーザー設定)
 */
export interface AuditRulesFile {
  /** 高頻度 exec 閾値 (default: 200) */
  highFreqExecThreshold?: number;
  /** 機密ファイル書き込み追加 patterns (regex source strings) */
  customSensitiveWritePatterns?: string[];
  /** 機密ファイル書き込み除外 patterns (regex source strings) */
  customSensitiveWriteWhitelist?: string[];
  /** schema version */
  version: 1;
}

const EMPTY_RULES: AuditRulesFile = { version: 1 };

export function defaultAuditRulesPath(): string {
  return join(homedir(), ".koji-lens", "audit-rules.json");
}

export function readAuditRules(filePath: string = defaultAuditRulesPath()): AuditRulesFile {
  try {
    const raw = readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<AuditRulesFile>;
    if (!parsed || typeof parsed !== "object") return { ...EMPTY_RULES };
    return {
      highFreqExecThreshold:
        typeof parsed.highFreqExecThreshold === "number"
          ? parsed.highFreqExecThreshold
          : undefined,
      customSensitiveWritePatterns: Array.isArray(parsed.customSensitiveWritePatterns)
        ? parsed.customSensitiveWritePatterns.filter((s) => typeof s === "string")
        : undefined,
      customSensitiveWriteWhitelist: Array.isArray(parsed.customSensitiveWriteWhitelist)
        ? parsed.customSensitiveWriteWhitelist.filter((s) => typeof s === "string")
        : undefined,
      version: 1,
    };
  } catch {
    return { ...EMPTY_RULES };
  }
}

export function writeAuditRules(
  rules: AuditRulesFile,
  filePath: string = defaultAuditRulesPath(),
): void {
  mkdirSync(dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp`;
  writeFileSync(tmp, JSON.stringify(rules, null, 2), "utf-8");
  renameSync(tmp, filePath);
}

/**
 * AuditRulesFile (regex source strings) → AuditAnomalyOptions の subset (RegExp[]) に変換
 * 不正な regex source は skip (try/catch)
 */
export function compileAuditRules(rules: AuditRulesFile): {
  highFreqExecThreshold?: number;
  customSensitiveWritePatterns?: RegExp[];
  customSensitiveWriteWhitelist?: RegExp[];
} {
  const compileList = (sources: string[] | undefined): RegExp[] => {
    if (!sources) return [];
    return sources.flatMap((s) => {
      try {
        return [new RegExp(s, "i")];
      } catch {
        return [];
      }
    });
  };
  return {
    highFreqExecThreshold: rules.highFreqExecThreshold,
    customSensitiveWritePatterns: compileList(rules.customSensitiveWritePatterns),
    customSensitiveWriteWhitelist: compileList(rules.customSensitiveWriteWhitelist),
  };
}
