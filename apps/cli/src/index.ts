#!/usr/bin/env node
import { Command } from "commander";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// 2026-09-24: 各コマンドは実行時に動的 import (statusline 等の起動を軽くする。
// 全コマンドを静的 import すると SQLite 等の読み込みだけで約 1 秒かかっていた)

const pkgPath = fileURLToPath(new URL("../package.json", import.meta.url));
const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version: string };

const program = new Command();

program
  .name("koji-lens")
  .description(
    "Claude Code local usage analyzer. Commands grouped: [cost] cost & analytics / [audit] audit & observability / [system] system & integration",
  )
  .version(pkg.version);

// 2026-05-17 Onboarding 改善 (鷹野最大反論「Activation 直結軸」採用):
// help 上部 (description 直後) に Quick Start + 主要コマンド 5 件案内
// 2026-05-17 白川 Critical 2 採用: 'after' → 'beforeAll' で 16 subcommand 一覧後のスクロール外押し出し回避
// 2026-05-17 白川 最大反論採用: Quick Start 3 番目 = audit --explain → export --format markdown
//   (Activation 直結軸: summary → tools → export markdown = Zenn/HN 投稿準備直結、audit は More セクション移動)
program.addHelpText(
  "beforeAll",
  `
Quick Start (try these 3 commands first):
  $ koji-lens summary --since 7d            # 7-day usage summary (cost / tokens / cache mix)
  $ koji-lens tools --since 7d              # tool invocation breakdown (Bash / Read / Edit / ...)
  $ koji-lens export --since 7d --format markdown   # share-ready Markdown for Zenn / HN / blog

More:
  $ koji-lens dashboard                # start local web UI (browser-based dashboard)
  $ koji-lens statusline --buddy       # 1-line spend / cache / state + koji mascot
  $ koji-lens audit --explain          # security audit + 警告 → 解消 hint
  $ koji-lens trend --weeks 8          # 8-week regression detection
  $ koji-lens --help                   # show all commands

Docs:        https://lens.kojihq.com/docs
Issues:      https://github.com/etoryoki/koji-lens/issues
Discussions: https://github.com/etoryoki/koji-lens/discussions/10  (share your usage / ask questions)
`,
);

program
  .command("summary")
  .description("[cost] Show usage summary for the given period")
  .option(
    "--since <expr>",
    'Period start: "Nh" / "Nd" / "Nw" or ISO date (months/years not supported — use ISO date for longer ranges)',
    "24h",
  )
  .option("--format <format>", "Output format: text | json", "text")
  .option("--dir <path>", "Claude Code log directory (default: config.logDir or ~/.claude/projects)")
  .option("--usd-jpy <rate>", "USD -> JPY conversion rate (default: config.usdJpy or 155)")
  .option("--no-cache", "Disable SQLite cache (~/.koji-lens/cache.db)")
  .option("--summary-only", "Show TOTAL only (skip per-session details)")
  .action(async (opts) => {
    try {
      await (await import("./commands/summary.js")).summaryCommand(opts);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command("sessions")
  .description("[cost] List recent sessions")
  .option(
    "--since <expr>",
    'Period start: "Nh" / "Nd" / "Nw" or ISO date (months/years not supported — use ISO date for longer ranges)',
    "7d",
  )
  .option("--limit <n>", "Max sessions to display", "10")
  .option("--dir <path>", "Claude Code log directory")
  .option("--no-cache", "Disable SQLite cache (~/.koji-lens/cache.db)")
  .action(async (opts) => {
    try {
      await (await import("./commands/sessions.js")).sessionsCommand(opts);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command("session <id>")
  .description("[cost] Show detail of a session")
  .option("--format <format>", "Output format: text | json", "text")
  .option("--dir <path>", "Claude Code log directory (default: config.logDir or ~/.claude/projects)")
  .option("--usd-jpy <rate>", "USD -> JPY conversion rate (default: config.usdJpy or 155)")
  .option("--no-cache", "Disable SQLite cache (~/.koji-lens/cache.db)")
  .action(async (id: string, opts) => {
    try {
      await (await import("./commands/session.js")).sessionCommand(id, opts);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command("compare")
  .description(
    "[cost] Compare usage between two periods (e.g. before/after Sonnet migration)",
  )
  .requiredOption(
    "--before <range>",
    "Before period (YYYY-MM-DD..YYYY-MM-DD format)",
  )
  .requiredOption(
    "--after <range>",
    "After period (YYYY-MM-DD..YYYY-MM-DD format)",
  )
  .option("--format <format>", "Output format: text | json", "text")
  .option("--dir <path>", "Claude Code log directory")
  .option("--usd-jpy <rate>", "USD -> JPY conversion rate")
  .option("--no-cache", "Disable SQLite cache (~/.koji-lens/cache.db)")
  .action(async (opts) => {
    try {
      await (await import("./commands/compare.js")).compareCommand(opts);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command("trend")
  .description(
    "[cost] Show weekly trend of cost / cache hit rate / latency / model changes (regression detection across N weeks)",
  )
  .option("--weeks <num>", "Number of weeks to display (1-52)", "4")
  .option("--format <format>", "Output format: text | json", "text")
  .option("--dir <path>", "Claude Code log directory")
  .option("--no-cache", "Disable SQLite cache (~/.koji-lens/cache.db)")
  .option(
    "--with-attribution",
    "[Pro] Attribute regressions to vendor (Anthropic) or user-side changes — requires KOJI_LENS_PRO=1 in dev mode",
  )
  .action(async (opts) => {
    try {
      await (await import("./commands/trend.js")).trendCommand(opts);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command("budget")
  .description(
    "[cost] Show month-to-date cost vs monthly budget + linear forecast to month-end",
  )
  .option(
    "--budget <usd>",
    "Monthly budget in USD (e.g., 200). Overrides KOJI_LENS_BUDGET env / config.budgetUsd",
  )
  .option("--format <format>", "Output format: text | json", "text")
  .option("--dir <path>", "Claude Code log directory")
  .option("--no-cache", "Disable SQLite cache (~/.koji-lens/cache.db)")
  .option(
    "--with-alerts",
    "Show budget alerts when forecast >= 80% (warning) or >= 100% (critical). Free feature: notification dispatch (email / webhook) is Pro.",
  )
  .option(
    "--project <key>",
    "Filter sessions to a specific project key + use config.budgets[<key>]",
  )
  .option(
    "--list",
    "Show all configured budgets (default + per-project) without computing forecast",
  )
  .action(async (opts) => {
    try {
      await (await import("./commands/budget.js")).budgetCommand(opts);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command("export")
  .description(
    "[system] Export session aggregates as CSV / JSON / Markdown (Zenn/dev.to/GitHub blog 貼付向け) for external analysis",
  )
  .option(
    "--since <expr>",
    'Period start: "Nh" / "Nd" / "Nw" or ISO date (default: 30 days)',
    "30d",
  )
  .option("--format <format>", "Output format: csv | json | markdown", "csv")
  .option("--dir <path>", "Claude Code log directory")
  .option("--no-cache", "Disable SQLite cache (~/.koji-lens/cache.db)")
  .option(
    "--output <file>",
    "Write to file instead of stdout (e.g., --output sessions.csv / report.md)",
  )
  .action(async (opts) => {
    try {
      await (await import("./commands/export.js")).exportCommand(opts);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command("statusline")
  .description(
    "[audit] Print a one-line savings status for Claude Code statusLine integration (this month vs last month)",
  )
  .option(
    "--mode <mode>",
    "Display density: minimal (icon only) | normal (icon + %) | detailed (icon + % + amount)",
    "normal",
  )
  .option("--format <format>", "Output format: statusline | json", "statusline")
  .option("--dir <path>", "Claude Code log directory")
  .option(
    "--state-file <path>",
    "Path to agent-state JSON written by Claude Code hooks (default: ~/.koji-lens/state.json)",
  )
  .option("--no-state", "Skip agent-state lookup (suppress ⚡/💤/🛑 icon)")
  .option("--no-spend", "Suppress spend trend signal (💚/💛/🚨/⚪ + percentage)")
  .option("--no-cache-rate", "Suppress cache hit rate signal (💎 X%)")
  .option("--no-cache", "Disable SQLite cache (~/.koji-lens/cache.db)")
  .option(
    "--no-budget",
    "Suppress budget alert signal (💸 X% for warning / 🔥 X% for critical). Auto-hidden if budgetUsd is not set.",
  )
  .option(
    "--no-audit",
    "Suppress audit anomaly signal (🛡 sensitive writes / ⚠ new MCP / high-freq exec). Auto-hidden if --no-cache is set.",
  )
  .option(
    "--buddy",
    "Enable koji-buddy decoration suffix (🍙·/+/✦/★/★★ for Lv1-5, appended to statusline tail). Persistent: set KOJI_LENS_BUDDY=1 in env",
  )
  .option(
    "--buddy-speech",
    "Show buddy saying inline (e.g., 🍙· \"いい発酵中…\")",
  )
  .option(
    "--buddy-type <type>",
    "Buddy character: koji (default, Phase α) | owl (Phase β) | cat (Phase β)",
    "koji",
  )
  .option(
    "--buddy-locale <locale>",
    "Buddy speech locale: ja (default) | en. Persistent: set KOJI_LENS_BUDDY_LOCALE in env",
  )
  .option(
    "--buddy-only",
    "Show only the buddy (suppresses spend/cache/state signals). Implies --buddy --buddy-speech. Outputs e.g. \"🍙· < ぽつぽつ…?\"",
  )
  .option(
    "--combined",
    "Concatenate ccusage statusline output before koji-lens output (cross-platform alternative to PowerShell wrapper). Falls back to koji-lens-only if ccusage is not installed. Ignored when --buddy-only is set.",
  )
  .option(
    "--no-rulenudge",
    "Hide the rulenudge signal (📏 N broken = CLAUDE.md rules broken in this project, read from ~/.rulenudge/status.json; shown only when rulenudge is used and N > 0)",
  )
  .action(async (opts) => {
    try {
      await (await import("./commands/statusline.js")).statuslineCommand(opts);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command("hook <state>")
  .description(
    "[system] Update agent state for statusline icon (use in Claude Code hooks). Cross-platform replacement for set-state.ps1 / set-state.sh.",
  )
  .action(async (state: string) => {
    try {
      await (await import("./commands/hook.js")).hookCommand(state);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command("serve")
  .description("[system] Start local web UI")
  .option("--port <port>", "Port to listen", "3210")
  .action(async (opts) => {
    await (await import("./commands/serve.js")).serveCommand(opts);
  });

program
  .command("config")
  .description("[system] Manage configuration at ~/.koji-lens/config.json")
  .argument("<action>", "get | set | unset | list | path")
  .argument("[key]", "config key (logDir | usdJpy)")
  .argument("[value]", "config value (for set)")
  .action(async (action: string, key?: string, value?: string) => {
    await (await import("./commands/config.js")).configCommand(action, key, value);
  });

program
  .command("login")
  .description("[system] Log in to koji-lens Pro (cloud sync)")
  .option("--base-url <url>", "Base URL for the Pro Web app", "https://lens.kojihq.com/app")
  .option("--token <token>", "Token (skip browser flow, for testing)")
  .action(async (opts) => {
    try {
      await (await import("./commands/login.js")).loginCommand({ baseUrl: opts.baseUrl, token: opts.token });
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command("sync")
  .description("[system] Sync local cache to koji-lens Pro (cloud sync, requires login)")
  .option("--batch-size <n>", "Sessions per batch (default: 50)", (v) => parseInt(v, 10))
  .option("--dry-run", "Show what would be sent without actually sending")
  .option(
    "--background",
    "Silent mode for hooks-driven automatic sync (suppress stdout, errors persisted to sync-state.json.lastSyncError)",
  )
  .action(async (opts) => {
    try {
      await (await import("./commands/sync.js")).syncCommand({
        batchSize: opts.batchSize,
        dryRun: opts.dryRun,
        background: opts.background,
      });
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command("status")
  .description(
    "[audit] Show sync status (last synced time, errors, recovery hints)",
  )
  .action(async () => {
    try {
      await (await import("./commands/status.js")).statusCommand();
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command("audit")
  .description(
    "[audit] List Claude Code tool_use audit events (fs-read / fs-write / exec / fetch / task / mcp / other) + --explain で警告 → 解消 hint",
  )
  .option(
    "--since <expr>",
    'Period start: "Nh" / "Nd" / "Nw" or ISO date',
    "24h",
  )
  .option(
    "--category <cat>",
    "Filter by category: fs-read | fs-write | exec | fetch | task | mcp | other",
  )
  .option("--tool <name>", "Filter by exact tool name (e.g., Bash, Edit)")
  .option("--format <format>", "Output format: text | json | csv", "text")
  .option("--dir <path>", "Claude Code log directory (default: ~/.claude/projects)")
  .option(
    "--out <path>",
    "Write audit log to file with atomic write (e.g., ~/.koji-lens/audit.log). Default: stdout",
  )
  .option(
    "--learn-mcp",
    "Learn detected MCP servers as known (clears statusline ⚠ for those servers)",
  )
  .option(
    "--sync",
    "[Pro] Sync audit events to koji-lens Pro cloud (Phase B 6/01-6/14 で本実装、現状 stub)",
  )
  .option(
    "--raw",
    "Disable PII redaction (debug only). Default: PII (email/phone/card/API key/UUID/AWS/GitHub/Slack/JWT) auto-redacted",
  )
  .option(
    "--explain",
    "Show audit anomaly warnings + 次に何すべきか hint (機密ファイル / 高頻度 exec / 新規 MCP)",
  )
  .option(
    "--no-cache",
    "Disable SQLite cache (debug only). Default: cache enabled = -75-88% speedup on 2nd+ run",
  )
  .action(async (opts) => {
    try {
      await (await import("./commands/audit.js")).auditCommand(opts);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

// 2026-05-23 koji-guard 残作業 2 (Phase 1 設計 v0.3): `koji-lens alert` subcommand
// audit-rules.json (~/.koji-lens/audit-rules.json) を CLI 経由で操作。
// `koji-lens audit --explain` が自動的に audit-rules.json を読み込んで
// customSensitiveWritePatterns + customSensitiveWriteWhitelist + highFreqExecThreshold
// を反映する (5/19 v0.2 拡張で実装済)。
const alertCmd = program
  .command("alert")
  .description(
    "[audit] Manage user-defined audit rules (~/.koji-lens/audit-rules.json) for `audit --explain`",
  );

alertCmd
  .command("ls")
  .description("List current audit rules (threshold + sensitive-write patterns + whitelist)")
  .action(async () => {
    try {
      await (await import("./commands/alert.js")).alertList();
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

alertCmd
  .command("add-pattern <regex>")
  .description(
    'Add a custom sensitive-write detection pattern (regex, case-insensitive). Example: \'\\.docker/config\'',
  )
  .action(async (regex: string) => {
    try {
      await (await import("./commands/alert.js")).alertAddPattern(regex);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

alertCmd
  .command("add-whitelist <regex>")
  .description(
    'Add a whitelist pattern that excludes matches from sensitive-write detection (regex, case-insensitive). Example: \'example|sample|template\'',
  )
  .action(async (regex: string) => {
    try {
      await (await import("./commands/alert.js")).alertAddWhitelist(regex);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

alertCmd
  .command("rm-pattern <index>")
  .description("Remove a sensitive-write pattern by index (see `alert ls`)")
  .action(async (index: string) => {
    try {
      await (await import("./commands/alert.js")).alertRmPattern(index);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

alertCmd
  .command("rm-whitelist <index>")
  .description("Remove a whitelist pattern by index (see `alert ls`)")
  .action(async (index: string) => {
    try {
      await (await import("./commands/alert.js")).alertRmWhitelist(index);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

alertCmd
  .command("set-threshold <n>")
  .description(
    "Set highFreqExecThreshold (default 200). `audit --explain` warns when exec count exceeds this.",
  )
  .action(async (n: string) => {
    try {
      await (await import("./commands/alert.js")).alertSetThreshold(n);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

alertCmd
  .command("unset-threshold")
  .description("Reset highFreqExecThreshold to default (200)")
  .action(async () => {
    try {
      await (await import("./commands/alert.js")).alertUnsetThreshold();
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

// 2026-05-17 修正案 6: dashboard = serve alias (discovery 向上、鷹野/CEO brainstorm)
program
  .command("dashboard")
  .description("[system] Alias for `serve` (start local web UI dashboard)")
  .option("--port <num>", "Port", "3210")
  .action(async (opts) => {
    try {
      const { serveCommand } = await import("./commands/serve.js");
      await serveCommand({ port: opts.port ?? "3210" });
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command("tools")
  .description(
    "[cost] Show tool invocation breakdown (Bash / Read / Edit / etc.) across sessions",
  )
  .option(
    "--since <expr>",
    'Period start: "Nh" / "Nd" / "Nw" or ISO date',
    "7d",
  )
  .option("--format <format>", "Output format: text | json", "text")
  .option("--dir <path>", "Claude Code log directory")
  .option("--limit <n>", "Show top N tools (default: 20)")
  .option("--no-cache", "Disable SQLite cache")
  .action(async (opts) => {
    try {
      await (await import("./commands/tools.js")).toolsCommand(opts);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program.parseAsync().catch((err) => {
  console.error(err);
  process.exit(1);
});
