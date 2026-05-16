---
name: koji-lens
description: Use koji-lens CLI to analyze Claude Code usage, costs, and tool_use audit history. Available subcommands include summary (period cost summary), audit (tool_use event extraction), compare (period vs period), trend (weekly trend with regression detection), budget (monthly forecast vs budget), and more. Auto-redacts PII (email/phone/card/API key/UUID) in audit output by default.
---

# koji-lens skill

[koji-lens](https://lens.kojihq.com) is a Claude Code local usage analyzer CLI + Pro web dashboard. This skill provides domain knowledge and common workflows for using koji-lens within Claude Code sessions.

## Quick reference

| Subcommand | Purpose |
|---|---|
| `koji-lens summary` | Period cost / token / session summary (default 24h) |
| `koji-lens sessions` | List recent sessions |
| `koji-lens session <id>` | Show detail of a specific session |
| `koji-lens compare --before <range> --after <range>` | Compare two periods (e.g., before/after model migration) |
| `koji-lens trend --weeks <n>` | Weekly trend with regression detection |
| `koji-lens budget --budget <usd>` | Month-to-date vs budget + linear forecast |
| `koji-lens export --format csv\|json` | Export session aggregates for external analysis |
| `koji-lens statusline` | One-line savings status (for Claude Code statusLine integration) |
| `koji-lens audit` | List tool_use audit events (fs-read/fs-write/exec/fetch/task/mcp/other) with auto PII redaction |
| `koji-lens serve` | Start local web UI |
| `koji-lens login` | Log in to koji-lens Pro (cloud sync) |
| `koji-lens sync` | Sync local cache to koji-lens Pro cloud |

## Common workflows

### 1. Quick cost check

```bash
koji-lens summary --since 24h
# or for the last 7 days
koji-lens summary --since 7d
```

### 2. Audit a session for security review

```bash
# All exec commands (Bash/PowerShell) in last 24h
koji-lens audit --since 24h --category exec

# All MCP server calls in last 7d, JSON for further processing
koji-lens audit --since 7d --category mcp --format json | jq '...'

# Save audit log to file (atomic write)
koji-lens audit --since 30d --out ~/.koji-lens/audit-2026-05.log

# Disable PII redaction (debug only, default is ON)
koji-lens audit --since 1h --raw

# Learn detected MCP servers as known (clears statusline ⚠ for those servers)
koji-lens audit --learn-mcp
```

### 3. Compare cost across model migration

```bash
# Before/after Sonnet → Haiku switch on April 15
koji-lens compare --before 2026-04-01..2026-04-14 --after 2026-04-15..2026-04-30
```

### 4. Weekly trend with regression detection

```bash
koji-lens trend --weeks 4
# JSON output for parsing
koji-lens trend --weeks 12 --format json
```

### 5. Budget alerts (Free feature; notification dispatch is Pro)

```bash
# Show current month spend vs budget with forecast
koji-lens budget --budget 200 --with-alerts

# Per-project budget
koji-lens budget --project my-project --with-alerts
```

### 6. Statusline integration

Add to `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "koji-lens statusline"
  }
}
```

For audit anomaly detection (new MCP servers, high-freq exec, sensitive writes), the statusline auto-adds ⚠ (warning) or 🛡 (critical) icons.

## Audit categories

- `fs-read` — Read, Glob, Grep, NotebookRead, ReadMcpResourceTool, ListMcpResourcesTool
- `fs-write` — Write, Edit, NotebookEdit
- `exec` — Bash, PowerShell
- `fetch` — WebFetch, WebSearch
- `task` — Task, Agent, TaskCreate, TaskUpdate, TaskList, TaskGet, TaskStop, TaskOutput
- `mcp` — `mcp__*` prefix (e.g., `mcp__github__create_pull_request`)
- `other` — anything else

## PII redaction (default ON)

`koji-lens audit` auto-redacts these patterns in both `target` (e.g., command text) and `input` fields:

- Email addresses → `[EMAIL]`
- UUIDs → `[UUID]`
- Stripe-style API keys (`sk_live_*`, `pk_test_*`) → `[API_KEY]`
- Bearer tokens (≥20 chars after `Bearer `) → `Bearer [TOKEN]`
- Credit card numbers (16 digits with separators) → `[CARD]`
- US phone numbers → `[PHONE_US]`
- JP phone numbers → `[PHONE_JP]`

Use `--raw` for debugging only.

## Pro features (β期間中 = 5/14 - 6/30 は無料)

- Cloud sync (`koji-lens login` + `koji-lens sync`)
- Web dashboard at `https://lens.kojihq.com/app`
- Future: Email alerts, Webhook alerts (Phase B: 6/01-6/14)

## Related

- LP: https://lens.kojihq.com
- Pro Web: https://lens.kojihq.com/app
- Community (日本語): https://hiroba.kojihq.com
- GitHub: https://github.com/etoryoki/koji-lens
- Docs: https://lens.kojihq.com/docs
