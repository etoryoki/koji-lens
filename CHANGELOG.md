# Changelog

All notable changes to this project are documented in this file.

For detailed release notes, see [GitHub Releases](https://github.com/etoryoki/koji-lens/releases).

## [0.1.0-beta.4] — 2026-05-02

### Added — CLI

- **`koji-lens statusline`**: One-line savings signal for [Claude Code's `statusLine` integration](https://docs.claude.com/en/docs/claude-code/settings#status-line). Three independent signal axes designed for at-a-glance reading:
  - **Spend trend**: 💚 / 💛 / 🚨 / ⚪ (this month vs last month)
  - **Cache efficiency**: 💎 / 🧊 / 💧 (prompt cache hit rate, 70% / 30% boundary)
  - **Agent state**: ⚡ / 💤 / 🛑 (running / idle / awaiting approval, requires hooks setup)
- **`koji-lens statusline --mode <minimal|normal|detailed>`**: Display density selector
  - `minimal` — icons only (e.g. `⚡ 💚 💎`), max compact for ccusage co-existence
  - `normal` — icons + percentages (e.g. `⚡ 💚 -40% 💎 78%`), default
  - `detailed` — icons + percentages + amounts + labels
- **`koji-lens statusline --no-state` / `--no-cache-rate`**: Opt-out flags for individual signal axes
- **`koji-lens compare --before <range> --after <range>`**: Period comparison command (e.g. before/after Sonnet migration), with rule-based Insights output
- Agent state hooks integration: write `~/.koji-lens/state.json` from Claude Code hooks (`UserPromptSubmit` / `PreToolUse` / `PostToolUse` / `Notification` / `Stop`) → statusline prepends state icon. 60s stale threshold prevents stuck icons after crashes.

### Added — LP / Web

- LP English version at <https://lens.kojihq.com/en> (Multiple Root Layouts via `app/(ja)/` + `app/(en)/`)
- LP Hero terminal pane integration (live `summary` example on the landing page)
- LP SEO: `description` enrichment + JSON-LD `screenshot` property
- LP Footer: Follow section with X / Bluesky / GitHub links (JA + EN)
- Web dashboard UX overhaul: subagent parent aggregation, project filter, period switcher (24h / 7d / 30d / all, default 30d), line chart + model-cost stacked area, EN/JA i18n
- Bilingual confirmation emails for waitlist + contact (EN body when `locale=en`)
- English OG image (`/og-en.png`) with English Hero copy

### Added — Repo / CI

- `CHANGELOG.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`
- `.github/ISSUE_TEMPLATE/` (bug report + feature request, form-based)
- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/dependabot.yml` (monthly npm + GitHub Actions updates)
- CI: explicit `build` job with workspace ordering (`core` → `web` → `lens` → `lp`) + CLI smoke check
- README: X (`@kojihq_jp`) + Bluesky (`@kojihq.com`) badges
- `packages/ccsg-poc/` (Claude Code Security Gateway PoC for Day 45 product evaluation)

### Changed

- Bluesky profile: bilingual JA + EN description, Koji-brand-first structure
- `metadata.alternates.languages` (hreflang) added to all paginated routes (root, contact, legal/{privacy,tos})
- sitemap.ts: alternates.languages on every JA/EN paired route
- README: "What can you do with this?" section with 2 user stories (Pro/Max subscriber + API user)

### Fixed

- EN page components were inheriting JP versions; now fully English (`SiteHeaderEn`, `SiteFooterEn`, `ContactFormEn`, `WaitlistFormEn`, `CopyButton` accepts `copiedLabel` prop)
- Waitlist confirmation email pricing synchronized between JA and EN templates
- `apps/lp/app/layout.tsx` was emitting `<html lang="ja">` for `/en` routes; resolved via Multiple Root Layouts

### Differentiator vs ccusage

koji-lens's statusline focuses on **signal** (judgment trigger) rather than raw cost numbers — `ccusage` excels at the latter. They coexist: ccusage shows what you're spending right now, koji-lens shows whether the trend is healthy. The cache-efficiency signal (💎 / 🧊 / 💧) in particular is a koji-lens-only axis (ccusage tracks raw cache token counts but not hit rate).

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
