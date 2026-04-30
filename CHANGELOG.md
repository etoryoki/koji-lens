# Changelog

All notable changes to this project are documented in this file.

For detailed release notes, see [GitHub Releases](https://github.com/etoryoki/koji-lens/releases).

## [0.1.0-beta.3] — 2026-04-30

### Added
- LP launched at <https://lens.kojihq.com>
- npm metadata: `homepage` set to LP URL
- README badges (npm version, weekly downloads, license)
- Documentation and Changelog sections in README
- CLI: `--summary-only` flag for `summary` command (TOTAL block only, useful for cron)
- CLI: per-model cost breakdown in TOTAL block (`cost by model:` line)
- CLI: period header in `summary` output (`period: <from> → <to> local`)
- CLI: localtime alongside ISO timestamps for `started:` / `ended:`
- CLI: subagent parent indicator in `sessions` output (`↳ subagent of <parent-id-8>`)
- CLI: clearer help text for `--since` (`Nh` / `Nd` / `Nw` or ISO date)
- Cache schema migration via `PRAGMA user_version` (version 1 → 2 for `costs_by_model_json` column)

### Changed
- `summary` output reorganized: TOTAL block now appears first, before per-session details
- `sessions` default `--limit` reduced from 20 → 10

## [0.1.0-beta.2] — 2026-04-23

### Added
- First stable beta release
- SQLite cache layer (better-sqlite3 + drizzle-orm)
- `--no-cache` flag for full rescan
- Pricing table externalized to JSON

### Fixed
- `web-standalone` pnpm symlink resolution (3-stage hotfix from beta.0)
- `serverExternalPackages` for better-sqlite3
- Build-machine absolute paths sanitized in `apps/web/server.js`
- `--version` returns correct value (was `0.0.0`)

## [0.1.0-beta.1] — 2026-04-23

### Fixed
- Hotfix attempt for symlink issue (superseded by beta.2)

## [0.1.0-beta.0] — 2026-04-23

### Added
- Initial npm publication of `@kojihq/lens` and `@kojihq/core`
- 5 CLI subcommands: `summary` / `sessions` / `session` / `serve` / `config`
- Web dashboard via `koji-lens serve` (Next.js 16 standalone bundle)
- JSONL parser with zod (forward + backward compatible via `passthrough()` + `optional()`)

### Known issues (resolved in beta.2)
- `pnpm add @kojihq/lens` may fail with `Cannot find module 'next'` due to symlink issue
- `--version` returns `0.0.0`

[0.1.0-beta.3]: https://github.com/etoryoki/koji-lens/releases/tag/v0.1.0-beta.3
[0.1.0-beta.2]: https://github.com/etoryoki/koji-lens/releases/tag/v0.1.0-beta.2
[0.1.0-beta.1]: https://github.com/etoryoki/koji-lens/releases/tag/v0.1.0-beta.1
[0.1.0-beta.0]: https://github.com/etoryoki/koji-lens/releases/tag/v0.1.0-beta.0
