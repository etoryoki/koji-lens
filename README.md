# koji-lens

[![npm beta](https://img.shields.io/npm/v/@kojihq/lens/beta.svg?label=@kojihq/lens)](https://www.npmjs.com/package/@kojihq/lens)
[![license](https://img.shields.io/npm/l/@kojihq/lens.svg)](./LICENSE)
[![node](https://img.shields.io/node/v/@kojihq/lens/beta.svg)](https://nodejs.org/)
[![X](https://img.shields.io/badge/X-@kojihq__jp-000000?logo=x&logoColor=white)](https://x.com/kojihq_jp)
[![Bluesky](https://img.shields.io/badge/Bluesky-@kojihq.com-0085ff?logo=bluesky&logoColor=white)](https://bsky.app/profile/kojihq.com)

> **Visualize your AI coding usage.** — [lens.kojihq.com](https://lens.kojihq.com) ([English](https://lens.kojihq.com/en))

Your local Claude Code usage analyzer. No servers, no signup — reads your local JSONL logs and shows your token usage with API-equivalent cost.

> **Note**: Cost figures are calculated as `tokens × Anthropic API price`. If you use Claude Code via API key, this matches your actual spend. If you use Claude Code via Claude Pro / Max subscription, this is a reference figure — your actual billing is the flat subscription fee. See [FAQ](#faq).

> **Status**: β (public beta). Install with `@beta` tag. See [Known limitations](#known-limitations).

---

## What can you do with this?

Two common situations where koji-lens earns its place.

### Story 1 — Claude Pro / Max subscriber: see what your subscription is really worth

You pay a flat $20/month for Pro (or $200 for Max). But are you using it like a $20 subscription, or like a $500 one? Anthropic doesn't show the answer anywhere.

```bash
$ koji-lens summary --since 30d
TOTAL
  cost: $874.12 (API-equivalent)
  models: opus×1562, sonnet×60
  note: Cost is API-rate equivalent.
        Subscribers pay a flat fee regardless.
```

That `$874.12` is what 30 days of usage would have cost on the API. If you're a $20/month Pro user, you just got 40× your subscription back. That's information you can't get from the Claude Code dashboard or the Anthropic Console — only from your local logs.

### Story 2 — API user: catch overspend before month-end

You pay per token via the API. You suspect Claude Code is burning through Opus on tasks Sonnet could handle, but you want numbers, not hunches.

```bash
$ koji-lens summary --since 7d
TOTAL
  cost:  $187.45
  cost by model:
    claude-opus-4-7    $173.21 (92%)
    claude-sonnet-4-6  $14.24  ( 8%)
  models: opus×238, sonnet×12
```

Now you have evidence: 92% of your spend is Opus. Switch the easy turns to Sonnet, run `koji-lens summary --since 7d` again next week, and see the difference. (A built-in `compare` command lands in a future release; for now you can pipe to `--format json` and diff yourself.)

---

## Install

```bash
pnpm add -g @kojihq/lens@beta
# or: npm i -g @kojihq/lens@beta
```

Node.js 22+ required.

## 30-second tour

```bash
# Total cost / tokens / tool usage for the last 24 hours
koji-lens summary --since 24h

# Recent sessions (default: last 7 days, top 20)
koji-lens sessions

# Deep dive into one session
koji-lens session <session-id>

# Launch the local web dashboard (charts + session table)
koji-lens serve
# → http://127.0.0.1:3210
```

All commands read directly from `~/.claude/projects/**/*.jsonl` — nothing leaves your machine.

## Commands

### `summary`

Shows aggregated metrics for a period: cost, tokens (input/output/cache), assistant turns, tool usage, top sessions.

```bash
koji-lens summary --since 24h
koji-lens summary --since 7d --format json      # machine-readable
koji-lens summary --since 2w --usd-jpy 160      # override FX rate
koji-lens summary --since 24h --no-cache        # bypass SQLite cache
```

Options: `--since <expr>` (e.g. `24h`, `7d`, `2w`, or ISO date), `--format text|json`, `--dir <path>`, `--usd-jpy <rate>`, `--no-cache`.

### `sessions`

Lists sessions in a period (one line per session: id, ended_at, duration, cost, turns, tools).

```bash
koji-lens sessions                   # last 7 days, 20 sessions
koji-lens sessions --since 30d --limit 50
```

### `session <id>`

Full detail of a single session: file path, time range, duration, per-turn counts, models, tools, cost breakdown.

```bash
koji-lens session 9b1f92a5-8f67-4f2a-91d3-f930adeb0c5f
koji-lens session <id> --format json
```

### `serve`

Starts a local web dashboard (Next.js, no external requests).

```bash
koji-lens serve                      # port 3210
koji-lens serve --port 3500
```

Dashboard includes cost/session bar chart, tokens stacked bar, tool usage pie, and a sortable session table.

### `statusline`

Prints a one-glance savings signal comparing this month vs. last month. Designed for [Claude Code's `statusLine` integration](https://docs.claude.com/en/docs/claude-code/settings#status-line) — pick the density that fits your status bar real estate. Drill into details via `koji-lens summary` or the web dashboard.

```bash
koji-lens statusline                       # 💚 -40% 💎 78%                              (default = normal)
koji-lens statusline --mode minimal        # 💚 💎                                       (icons only, max compact)
koji-lens statusline --mode detailed       # 💚 -40% vs last month | $40 saved | 💎 78% cache
koji-lens statusline --no-cache-rate       # 💚 -40%                                     (suppress cache signal)
koji-lens statusline --format json         # full CompareResult + cache rate for scripting
```

The cache signal shows this month's prompt-cache hit rate (cache read / (cache read + new input tokens)). Higher = more cache reuse = lower cost per turn. Icon shifts with the rate so you can read the state at a glance without checking the number: 💎 ≥ 70% (excellent) / 🧊 30–70% (cool) / 💧 < 30% (low). koji-lens's independent axis from spend trend.

**Mode selection guide**: `minimal` when you run alongside another statusline (e.g. ccusage) and want the smallest possible footprint / `normal` for standalone use / `detailed` when statusline is your only spend dashboard.

#### Optional: agent state icon (⚡ / 💤 / 🛑)

If you write Claude Code's current state to `~/.koji-lens/state.json` from hooks, koji-lens appends an icon: ⚡ running / 💤 idle / 🛑 awaiting approval. The icon disappears automatically after 60 seconds of staleness (so a crashed session doesn't leave a permanent ⚡).

State file schema:

```json
{ "state": "thinking" | "running" | "idle" | "awaiting_approval", "since": 1714680000000, "tool": "Bash" }
```

Example `~/.claude/settings.json` hooks (Windows / PowerShell):

```json
{
  "hooks": {
    "UserPromptSubmit": [{ "hooks": [{ "type": "command", "command": "powershell -NoProfile -ExecutionPolicy Bypass -File C:/Users/<you>/.koji-lens/set-state.ps1 -State thinking" }] }],
    "PreToolUse":       [{ "matcher": "*", "hooks": [{ "type": "command", "command": "powershell -NoProfile -ExecutionPolicy Bypass -File C:/Users/<you>/.koji-lens/set-state.ps1 -State running" }] }],
    "PostToolUse":      [{ "matcher": "*", "hooks": [{ "type": "command", "command": "powershell -NoProfile -ExecutionPolicy Bypass -File C:/Users/<you>/.koji-lens/set-state.ps1 -State thinking" }] }],
    "Notification":     [{ "hooks": [{ "type": "command", "command": "powershell -NoProfile -ExecutionPolicy Bypass -File C:/Users/<you>/.koji-lens/set-state.ps1 -State awaiting_approval" }] }],
    "Stop":             [{ "hooks": [{ "type": "command", "command": "powershell -NoProfile -ExecutionPolicy Bypass -File C:/Users/<you>/.koji-lens/set-state.ps1 -State idle" }] }]
  }
}
```

macOS / Linux equivalent (replace `set-state.ps1` invocation with a one-line `bash` `printf` or a `set-state.sh` helper that writes the same JSON schema). Pass `--no-state` to `koji-lens statusline` to opt out of the icon entirely.

To wire it into Claude Code, add to `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "koji-lens statusline",
    "padding": 0
  }
}
```

Emoji legend: 💚 cost dropped > 10% / 💛 within ±10% / 🚨 cost rose > 10% / ⚪ no last-month data.

Designed to coexist with [ccusage](https://ccusage.com)'s statusline — ccusage shows *current spend in detail*, koji-lens shows *the one signal you need to act on*. Use both, or pick one.

### `config`

Persisted in `~/.koji-lens/config.json`.

```bash
koji-lens config list
koji-lens config set logDir "/custom/path/to/.claude/projects"
koji-lens config set usdJpy 160
koji-lens config unset usdJpy
koji-lens config path                # where the file lives
```

## How it works

- **Reads local JSONL directly.** No telemetry, no network calls, no account.
- **SQLite cache** at `~/.koji-lens/cache.db` speeds up repeated runs (~7× faster on the measured case). Pass `--no-cache` to bypass.
- **Per-session streaming parse** with [zod](https://zod.dev). Unrecognized records are skipped silently so format changes in Claude Code don't break the whole analysis.
- **Model pricing** is shipped as `pricing.json` inside the package. Override is possible by editing `node_modules/@kojihq/core/dist/pricing.json` until runtime config lands.

## Known limitations

- β. APIs and CLI flags may change before 1.0.
- Model pricing is kept current at release time. If Anthropic announces a price change, we ship a patch release within a few days.
- Windows is supported (primary dev environment), macOS and Linux are expected to work. File an issue if you hit OS-specific trouble.
- Old sessions from before `~/.claude/projects` existed are not analyzed (use `--dir` if your logs live elsewhere).

## FAQ

**Does this send my logs to any server?**
No. `@kojihq/lens` runs entirely locally. `koji-lens serve` binds to `127.0.0.1` only.

**Can I use it without installing globally?**
Yes: `pnpm dlx @kojihq/lens@beta summary --since 24h` (or `npx @kojihq/lens@beta ...`).

**Why `@beta` tag?**
The `latest` tag also points to the current β now, so `pnpm add @kojihq/lens` works too. We keep `@beta` usage in docs to make it obvious that 1.0 has not shipped yet.

**Does the cost figure match my Claude Code bill?**
It depends on how you use Claude Code:
- **API key (pay-as-you-go)**: Yes, the cost figure matches your actual spend.
- **Claude Pro / Max subscription**: No. Subscribers pay a flat monthly fee regardless of token usage. The cost figure shown here is "what it would have cost on the API" — useful as a reference for comparing usage patterns or evaluating whether the subscription is worth it, but it is not your actual bill.

We're working on subscription-aware features (rate-limit forecasting, usage-balance insights) that are more directly useful to subscribers — see the roadmap.

**Is there a Pro/cloud plan?**
Not yet. The roadmap includes optional cloud sync for cross-device aggregation in a later phase. The local-first experience will always be free.

## Development

This is a pnpm monorepo. Contributions welcome — file an issue first for non-trivial changes.

```
koji-lens/
├── apps/
│   ├── cli/          @kojihq/lens   (commander-based CLI)
│   └── web/          @kojihq/web    (Next.js 16, App Router, Tailwind v4, Recharts)
└── packages/
    └── core/         @kojihq/core   (zod schema, aggregator, pricing, SQLite cache)
```

```bash
pnpm install
pnpm -r build
pnpm -r typecheck
pnpm test            # vitest, 25 tests in @kojihq/core
```

Run locally without installing globally:

```bash
node ./apps/cli/dist/index.js summary --since 24h
```

Publishing: see [`docs/publish.md`](./docs/publish.md).

## License

[MIT](./LICENSE) © 2026 株式会社クインクエ (Koji)
