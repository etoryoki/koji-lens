# @kojihq/core

Core types and parsers for [koji-lens](https://github.com/etoryoki/koji-lens) — a Claude Code local usage analyzer.

This package is re-exported by the [`@kojihq/lens`](https://www.npmjs.com/package/@kojihq/lens) CLI. You can depend on it directly if you want programmatic access to the parser, aggregation, and pricing logic.

## Install

```bash
pnpm add @kojihq/core
```

Requires Node.js >= 22.

## What's here

- **JSONL parsing** with zod: `parseRecord`, `ClaudeCodeRecordSchema`
- **Per-session aggregation**: `analyzeFile`, `analyzeDirectory`, `analyzeDirectoryCached`
- **Pricing table** (provisional, Opus 4.7 / Sonnet 4.6 / Haiku 4.5): `priceFor`
- **Log path detection**: `defaultClaudeLogDir`, `findJsonlFiles`
- **Formatting helpers**: `renderSummary`, `renderSessionBlock`, `formatUsd`, `formatJpy`, `formatDuration`
- **Config store** (`~/.koji-lens/config.json`): `loadConfig`, `setConfigValue`
- **SQLite cache layer** via `better-sqlite3` + `drizzle-orm`: `openCacheDb`, `upsertSessionCache`, `analyzeDirectoryCached`

## Status

Beta. APIs may change before 1.0. See the [roadmap](https://github.com/etoryoki/koji-lens).

## License

MIT
