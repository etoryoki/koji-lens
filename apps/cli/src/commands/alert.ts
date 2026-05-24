/**
 * `koji-lens alert` subcommand: audit-rules.json (~/.koji-lens/audit-rules.json)
 * の表示・追加・削除・閾値設定を CLI 経由で行う。
 *
 * 2026-05-23 koji-guard 残作業 2 (Phase 1 設計 v0.3 整合、継承エラー 40 例目検出後)
 *
 * 5/19 v0.2 拡張で audit-state.ts に AuditRulesFile + read/write/compile は実装済、
 * ユーザーは手で audit-rules.json を編集する状態だった = DX 改善のため CLI subcommand 追加。
 *
 * 用例:
 *   koji-lens alert ls
 *   koji-lens alert add-pattern   '\\.docker/config'
 *   koji-lens alert add-whitelist 'example|sample|template'
 *   koji-lens alert rm-pattern   0
 *   koji-lens alert rm-whitelist 1
 *   koji-lens alert set-threshold 100
 *   koji-lens alert unset-threshold
 */

import {
  readAuditRules,
  writeAuditRules,
  defaultAuditRulesPath,
  type AuditRulesFile,
} from "@kojihq/core";

function formatRules(rules: AuditRulesFile): string {
  const lines: string[] = [];
  lines.push(`audit-rules.json (${defaultAuditRulesPath()})`);
  lines.push("");
  lines.push(
    `highFreqExecThreshold: ${
      rules.highFreqExecThreshold === undefined
        ? "(default 200)"
        : String(rules.highFreqExecThreshold)
    }`,
  );
  lines.push("");
  lines.push("customSensitiveWritePatterns (機密ファイル書き込み追加検出):");
  const patterns = rules.customSensitiveWritePatterns ?? [];
  if (patterns.length === 0) {
    lines.push("  (none)");
  } else {
    patterns.forEach((p, i) => lines.push(`  [${i}] /${p}/i`));
  }
  lines.push("");
  lines.push("customSensitiveWriteWhitelist (機密ファイル書き込み除外):");
  const whitelist = rules.customSensitiveWriteWhitelist ?? [];
  if (whitelist.length === 0) {
    lines.push("  (none)");
  } else {
    whitelist.forEach((p, i) => lines.push(`  [${i}] /${p}/i`));
  }
  return lines.join("\n");
}

function validateRegex(source: string): void {
  try {
    new RegExp(source, "i");
  } catch (err) {
    throw new Error(
      `Invalid regex pattern: ${source}\n  (${err instanceof Error ? err.message : String(err)})`,
    );
  }
}

export function alertList(): void {
  const rules = readAuditRules();
  process.stdout.write(formatRules(rules) + "\n");
}

export function alertAddPattern(pattern: string): void {
  validateRegex(pattern);
  const rules = readAuditRules();
  const next: AuditRulesFile = {
    ...rules,
    customSensitiveWritePatterns: [
      ...(rules.customSensitiveWritePatterns ?? []),
      pattern,
    ],
    version: 1,
  };
  writeAuditRules(next);
  console.log(`Added sensitive-write pattern: /${pattern}/i`);
}

export function alertAddWhitelist(pattern: string): void {
  validateRegex(pattern);
  const rules = readAuditRules();
  const next: AuditRulesFile = {
    ...rules,
    customSensitiveWriteWhitelist: [
      ...(rules.customSensitiveWriteWhitelist ?? []),
      pattern,
    ],
    version: 1,
  };
  writeAuditRules(next);
  console.log(`Added whitelist pattern: /${pattern}/i`);
}

function parseIndex(raw: string, listLen: number, label: string): number {
  const idx = Number.parseInt(raw, 10);
  if (!Number.isInteger(idx) || idx < 0) {
    throw new Error(`Invalid index: ${raw} (use a non-negative integer)`);
  }
  if (idx >= listLen) {
    throw new Error(
      `Index ${idx} out of range for ${label} (length ${listLen}). Run \`koji-lens alert ls\` to see indices.`,
    );
  }
  return idx;
}

export function alertRmPattern(indexRaw: string): void {
  const rules = readAuditRules();
  const list = rules.customSensitiveWritePatterns ?? [];
  const idx = parseIndex(indexRaw, list.length, "customSensitiveWritePatterns");
  const removed = list[idx];
  const next: AuditRulesFile = {
    ...rules,
    customSensitiveWritePatterns: [
      ...list.slice(0, idx),
      ...list.slice(idx + 1),
    ],
    version: 1,
  };
  writeAuditRules(next);
  console.log(`Removed sensitive-write pattern [${idx}]: /${removed}/i`);
}

export function alertRmWhitelist(indexRaw: string): void {
  const rules = readAuditRules();
  const list = rules.customSensitiveWriteWhitelist ?? [];
  const idx = parseIndex(indexRaw, list.length, "customSensitiveWriteWhitelist");
  const removed = list[idx];
  const next: AuditRulesFile = {
    ...rules,
    customSensitiveWriteWhitelist: [
      ...list.slice(0, idx),
      ...list.slice(idx + 1),
    ],
    version: 1,
  };
  writeAuditRules(next);
  console.log(`Removed whitelist pattern [${idx}]: /${removed}/i`);
}

export function alertSetThreshold(raw: string): void {
  const n = Number.parseInt(raw, 10);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`Invalid threshold: ${raw} (use a positive integer)`);
  }
  const rules = readAuditRules();
  const next: AuditRulesFile = {
    ...rules,
    highFreqExecThreshold: n,
    version: 1,
  };
  writeAuditRules(next);
  console.log(`Set highFreqExecThreshold = ${n}`);
}

export function alertUnsetThreshold(): void {
  const rules = readAuditRules();
  const next: AuditRulesFile = {
    ...rules,
    highFreqExecThreshold: undefined,
    version: 1,
  };
  writeAuditRules(next);
  console.log("Unset highFreqExecThreshold (using default 200)");
}
