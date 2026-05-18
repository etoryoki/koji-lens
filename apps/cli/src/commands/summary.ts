import {
  analyzeDirectory,
  defaultClaudeLogDir,
  loadConfig,
  normalizeDirArg,
  parseSince,
  renderSummary,
  sumAggregates,
  type SessionAggregate,
} from "@kojihq/core";
import { analyzeDirectoryCached, openCacheDb } from "@kojihq/core-sqlite";
import { triggerLazySync } from "../lib/lazy-sync.js";

export interface SummaryOptions {
  since: string;
  format: string;
  dir?: string;
  usdJpy?: string;
  cache: boolean;
  summaryOnly?: boolean;
}

const DEFAULT_USD_JPY = 155;

export async function summaryCommand(opts: SummaryOptions): Promise<void> {
  triggerLazySync();
  const cfg = loadConfig();
  const dir = normalizeDirArg(opts.dir ?? cfg.logDir ?? defaultClaudeLogDir());
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

  const active = all.filter((a) => a.assistantTurns > 0 || a.userTurns > 0);
  const total = sumAggregates(active);
  const rate = opts.usdJpy !== undefined
    ? Number(opts.usdJpy)
    : cfg.usdJpy ?? DEFAULT_USD_JPY;

  if (opts.format === "json") {
    const payload = opts.summaryOnly
      ? {
          generatedAt: new Date().toISOString(),
          since: since.toISOString(),
          dir,
          total,
        }
      : {
          generatedAt: new Date().toISOString(),
          since: since.toISOString(),
          dir,
          total,
          sessions: active,
        };
    process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
    return;
  }

  if (active.length === 0) {
    // 2026-05-18 案 6-A: 12 行構造化 + テンプレートリテラル統合 + --dir 安全例示
    // 深町 CTO 諮問結果採用 (Critical 最大反論「案 6 単独限界」前提 + 観点 1-4 全採用 + Warning --dir ~ 問題対応)
    console.log(`No active sessions under ${dir} since ${since.toISOString()}.

  -> Claude Code has not been used here yet, or JSONL logs are elsewhere.

To get started with Claude Code:
  macOS / Linux / WSL:  curl -fsSL https://claude.ai/install.sh | bash
  Windows PowerShell:   irm https://claude.ai/install.ps1 | iex
  Then run: claude   (in your project directory)

If Claude Code is installed, try:
  koji-lens summary                       (default: checks ~/.claude/projects/)
  koji-lens summary --dir <full-path>     (full path, do not use ~)

Docs:      https://lens.kojihq.com/docs
Questions: https://github.com/etoryoki/koji-lens/discussions/10
Community: https://hiroba.kojihq.com`);
    return;
  }

  active.sort((a, b) => (b.endedAt ?? "").localeCompare(a.endedAt ?? ""));
  process.stdout.write(
    renderSummary(active, total, {
      usdJpy: rate,
      summaryOnly: opts.summaryOnly,
      since,
      until: new Date(),
      sinceLabel: opts.since,
    }) + "\n",
  );
}
