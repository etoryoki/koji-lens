# Changelog

All notable changes to this project are documented in this file.

For detailed release notes, see [GitHub Releases](https://github.com/etoryoki/koji-lens/releases).

## [0.1.0-beta.7] — 2026-05-08

### Changed

- **buddy speech format**: Add space around `<` for visual readability — `🍙· <ぽつぽつ…?` → `🍙· < ぽつぽつ…?` (owner request 2026-05-08).

### Added — koji-buddy Lv expansion (5 → 10, 3-year Max design)

Owner request 2026-05-08: "Lv level should not max out even after years of use, ~3 years for Max". Previous design (Lv5 at 1,000 sessions) was reachable in ~12 days for heavy users.

**New Lv thresholds** (`computeBuddyLevel`):

| Lv | Decoration | Sessions threshold | Heavy user (88/day) | Light user (10/day) |
|----|------------|---|---|---|
| 1 | `🍙·` | < 30 | ~ 8 hours | ~ 3 days |
| 2 | `🍙+` | 30 | ~ 1 day | ~ 1 month |
| 3 | `🍙✦` | 100 | ~ 3 days | ~ 1.5 months |
| 4 | `🍙★` | 300 | ~ 1 week | ~ 3 months |
| 5 | `🍙★★` | 1,000 | ~ 12 days | ~ 1 year |
| 6 (new) | `🍙★★★` | 3,000 | ~ 1 month | ~ 3 years |
| 7 (new) | `🍙❀` | 10,000 | ~ 4 months | ~ 10 years |
| 8 (new) | `🍙✿` | 30,000 | ~ 1 year | ~ 30 years |
| 9 (new) | `🍙❋` | 60,000 | ~ 2 years | ~ 60 years |
| 10 (new) | `🍙❀❀` | 100,000 | **~ 3 years (Max)** | ~ 100 years |

**New decorations** (Lv6-10): Triple star → florette → rotated florette → blackletter florette → double florette (麹発酵深化モチーフ、Lv7 `❀` からの自然延長、ASCII-leaning for cross-platform stability per fukamachi Warning 3).

**New 25 sayings** (5 states × 5 new levels = 50 sayings total, was 25): CEO standalone draft (Shirakawa Designer consultation pending, will refine in v0.6.1 → v1.0).

**Flagship Lv10 healthy saying** (Ferment Small symbol for the new max tier, Shirakawa Critical 1 採用 = silent presence over self-referential): "ただ、在る…" — the koji simply *is*, no need for words at the 3-year mark.

### Tests

- 16 new tests added (Lv6-10 thresholds + Lv10 decoration + Lv10 flagship saying), buddy matrix coverage updated from 25 to 50 sayings.

## [0.1.0-beta.6] — 2026-05-08

### Fixed

- **buddy position not actually applied in `beta.5` (build hook missing)**: The `c19f087` commit changed `renderBuddyPrefix` → `renderBuddySuffix` and reordered concatenation to put buddy at the tail of statusline, but `pnpm publish` doesn't run `prepublish` / `prepublishOnly` hooks (no script defined in `packages/core/package.json` or `apps/cli/package.json`), so the published `dist/` was the old prefix-position build. `beta.6` fixes this with a fresh build before publish. Memory `feedback_inherited_factual_error_in_documents.md` case 8 candidate ("implementation completion vs build completion vs publish completion vs user-reachability completion" 5-stage decomposition).

### Changed

- **buddy speech format**: `🍙+ "順調…"` → `🍙+ <順調…` (open-bracket style for speech-bubble feel, owner request 2026-05-08). Removes double-quotes for cleaner inline display in statusline.

### Internal

- **`prepublishOnly` hook added to all 4 publishable packages** (`@kojihq/lens`, `@kojihq/core`, `@kojihq/core-sqlite`, `@kojihq/core-pg`): `"prepublishOnly": "pnpm build"` ensures `pnpm publish` always runs a fresh build before publishing, preventing the `beta.5` recurrence (where `c19f087` source change was not reflected in the published `dist/`). 5-stage completion concept now structurally enforced: 1) design → 2) implementation → 3) **build** → 4) publish → 5) user-reachability.

## [0.1.0-beta.5] — 2026-05-08

### Fixed

- **statusline runtime error** (`be1db13`): `_AssertSqliteRowConvertible is not defined` runtime error caused empty `koji-lens statusline` output and PowerShell wrapper fallback `⚪ koji-lens err` mojibake on Windows cp932. Removed `export type _Assert*` aliases from `packages/core-sqlite/src/schema.ts` + `packages/core-pg/src/schema.ts`; function signature `function rowToCachedAggregate(row: SessionRow): CachedSessionAggregate` ensures type safety.
- **Language switch ineffective in `accept-language=ja` environment** (`be61c39`): `langSwitchHref` now always adds `lang=` parameter explicitly so URL-based language switching works regardless of browser locale.

### Added — CLI

- **🍙 koji-buddy Phase α** (`678280c`): Companion character in statusline with 25 production-quality lines (5 states × 5 levels) for the koji character (麹 = Japanese fermentation starter, Ferment Small symbol).
  - Decorative icons: `🍙·` (Lv1) / `🍙+` (Lv2) / `🍙✦` (Lv3) / `🍙★` (Lv4) / `🍙★★` (Lv5), all fixed 3 cells (no jitter on `refreshInterval=1`).
  - Position: appended to statusline tail — `⚡ 💚 💎 🍙+` (decoration) / `⚡ 💚 💎 🍙+ "順調…"` (with speech).
  - Flags: `--buddy` (enable) / `--buddy-speech` (allow random speech every 2h) / `--buddy-type <koji>` / `--no-buddy`.
  - Env: `KOJI_LENS_BUDDY=1` for persistence.
  - 17 tests pass.
- **`koji-lens compare`**: Savings dashboard Step 1-3 with `compare.ts` + `insights.ts` core logic, period delta + rule-based insights output (45 tests pass).
- **`koji-lens trend --with-attribution`** (`60ffc22`): Pro feature gate with vendor/user attribution for trend regressions.
- **`koji-lens budget`** (`6667041`): Budget tracking with `--budget` (required) + `--with-alerts` (Pro flag), CLI header + table format.
- **`koji-lens export`** (`2b1d4e2`): Data ownership with CSV / JSON formats + `--since` filter + stdout / file output (88 sessions verified).
- **Multi-project budget** (`abe7803`, Pro): `KojiLensConfig.budgets?: Record<string, number>` + 5-tier resolution (URL > env > `config.budgets[<project>]` > `config.budgets._default` > `config.budgetUsd`) + `budget --project <key>` / `--list` options.

### Added — Web Dashboard

- **Hourly cost heatmap** (`a5228f1`): 24 (hour) × 7 (day) HTML grid with CSS opacity intensity (lightweight, no Recharts).
- **Budget trend chart** (`0e10ed4`): `BudgetTrendChart` with cumulative blue line + linear forecast (emerald dashed) + budget reference line (amber horizontal). `computeDailyBudgetTrend` + `DailyBudgetPoint` type added to `packages/core/src/budget.ts`.
- **Weekly trend chart** (`6667041`): `WeeklyTrendChart` dual-axis line chart (cache% blue left axis + p95 latency amber right axis), integrated above `TrendTable` in Pro Trend section.

### Added — Internal

- **drizzle schema Step 1-3** (`53660d3`): `packages/core-pg/` new package (Postgres cache adapter for Pro cloud sync via Neon), pgTable schema with 21 columns, `aggregateToRow` / `rowToCachedAggregate` helpers, `@electric-sql/pglite` devDependency for roundtrip testing.
- **drizzle Step 4 pglite roundtrip test** (`19a97e8`): Caught and fixed PostgreSQL INTEGER 32-bit overflow Critical issue; `mtime_ms` / `cached_at` changed to `bigint` mode `"number"`. New tests: 5 pass.
- **300-session fixture benchmark** (`aad2a50`): 100 sessions = `upsert 48ms` / `list 3ms`; 300 sessions = `upsert 156ms` / `list 2ms`; `isCacheFresh × 300` = `9ms` total.
- **`insights.ts` policy change date constants** (`5b9ba14`): `POLICY_CHANGE_DATES = ["2026-05-06"]` + `rangeCrossesPolicyChange` helper; warning message prepended outside `MAX_INSIGHTS` slot when comparison period crosses policy change date.
- **Budget config persistence** (`ee72486`): `config.json` + `KojiLensConfig.budgetUsd` field with 3-tier resolution (URL > env > config).
- **Turbopack SSR ReferenceError fix**: Changed `declare const _assertX + void` to `export type _AssertX` type aliases.

### Changed

- **better-sqlite3 dependency separation finalized**: `packages/core-sqlite/` separates SQLite-native code from `@kojihq/core`, unblocking Pro Web dashboard (`lens.kojihq.com/app`) to use `@kojihq/core-pg` (Neon) without native module conflicts on Vercel deployment.

### npm publish structure fix

- **`latest` dist-tag** updated from `0.1.0-beta.2` (4/22 bug-fix release) to `0.1.0-beta.5`. Previously `pnpm publish --tag beta` only updated the `beta` dist-tag, leaving `latest` stale at `beta.2` for ~16 days. Users running `npm install @kojihq/lens` (without `@beta` suffix) were receiving the bug-fix-only `beta.2` build instead of the latest pre-release. From `beta.5` onwards, both `latest` and `beta` dist-tags will be updated together until `1.0.0` GA.

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
