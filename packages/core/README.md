# @kojihq/core

[![npm version](https://img.shields.io/npm/v/@kojihq/core.svg)](https://www.npmjs.com/package/@kojihq/core)
[![npm downloads](https://img.shields.io/npm/dw/@kojihq/core.svg)](https://www.npmjs.com/package/@kojihq/core)
[![license](https://img.shields.io/npm/l/@kojihq/core.svg)](https://github.com/etoryoki/koji-lens/blob/main/LICENSE)

Core types and parsers for [koji-lens](https://lens.kojihq.com) — a Claude Code local usage analyzer.

This package is re-exported by the [`@kojihq/lens`](https://www.npmjs.com/package/@kojihq/lens) CLI. You can depend on it directly if you want programmatic access to the parser, aggregation, and pricing logic.

## Documentation

- **LP**: <https://lens.kojihq.com>
- **GitHub**: <https://github.com/etoryoki/koji-lens>
- **npm**: <https://www.npmjs.com/package/@kojihq/core>
- **Issue tracker**: <https://github.com/etoryoki/koji-lens/issues>

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

## Changelog

リリース履歴は [GitHub Releases](https://github.com/etoryoki/koji-lens/releases) を参照してください。

主要なリリース:
- `v0.1.0-beta.2` — 最初の安定 β（cache、`--no-cache`、pricing.json 外部化）

## License

MIT
