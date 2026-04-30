# @kojihq/lens

[![npm version](https://img.shields.io/npm/v/@kojihq/lens.svg)](https://www.npmjs.com/package/@kojihq/lens)
[![npm downloads](https://img.shields.io/npm/dw/@kojihq/lens.svg)](https://www.npmjs.com/package/@kojihq/lens)
[![license](https://img.shields.io/npm/l/@kojihq/lens.svg)](https://github.com/etoryoki/koji-lens/blob/main/LICENSE)

> **Visualize your AI coding usage.** — [lens.kojihq.com](https://lens.kojihq.com)

`koji-lens` — the CLI for Claude Code local usage analysis.

Reads `~/.claude/projects/**/*.jsonl` directly on your machine, aggregates tokens / cost / tool usage, and ships with a local Web UI.

**Status**: beta (0.1.0-beta). Features may change before 1.0.

## Documentation

- **LP**: <https://lens.kojihq.com>
- **GitHub**: <https://github.com/etoryoki/koji-lens>
- **npm**: <https://www.npmjs.com/package/@kojihq/lens>
- **Issue tracker**: <https://github.com/etoryoki/koji-lens/issues>

## Install

```bash
pnpm add -g @kojihq/lens
# or
npm i -g @kojihq/lens
```

Requires Node.js >= 22.

## Quick start

```bash
# Last 24 hours summary
koji-lens summary --since 24h

# Last 7 days, list recent sessions
koji-lens sessions --since 7d --limit 20

# One specific session
koji-lens session <session-id>

# Local Web UI (opens at http://127.0.0.1:3210)
koji-lens serve

# Config (logDir / usdJpy) at ~/.koji-lens/config.json
koji-lens config list
koji-lens config set logDir "/custom/path/to/.claude/projects"
koji-lens config set usdJpy 160
koji-lens config unset usdJpy
koji-lens config path
```

## Commands

### `koji-lens summary`

Show aggregated usage for a period.

- `--since <expr>`: `24h` / `7d` / `2w` / ISO date (default `24h`)
- `--format <text|json>`: output format (default `text`)
- `--dir <path>`: log directory override
- `--usd-jpy <rate>`: exchange rate (default 155, or `config.usdJpy`)
- `--no-cache`: disable SQLite cache

### `koji-lens sessions`

List recent sessions.

- `--since <expr>` (default `7d`)
- `--limit <n>` (default `20`)
- `--dir <path>`
- `--no-cache`

### `koji-lens session <id>`

Show detail of a session.

- `--format <text|json>`
- `--dir <path>`
- `--usd-jpy <rate>`

### `koji-lens serve`

Start the local Web UI (read-only dashboard).

- `--port <port>` (default `3210`)

### `koji-lens config <action> [key] [value]`

- `get <key>` / `set <key> <value>` / `unset <key>` / `list` / `path`
- Known keys: `logDir`, `usdJpy`

## Privacy & data

- All log parsing happens **on your machine**.
- No data is uploaded anywhere.
- The SQLite cache lives at `~/.koji-lens/cache.db`.
- The Web UI binds to `127.0.0.1` only.

## Changelog

リリース履歴は [GitHub Releases](https://github.com/etoryoki/koji-lens/releases) を参照してください。

主要なリリース:
- `v0.1.0-beta.2` — 最初の安定 β（cache、`--no-cache`、pricing.json 外部化）

## License

MIT

## Links

- Repo: https://github.com/etoryoki/koji-lens
- Issues: https://github.com/etoryoki/koji-lens/issues
