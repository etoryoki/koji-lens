# Contributing to koji-lens

Thanks for your interest in koji-lens. This document covers how to file issues, propose changes, and run the project locally.

## Filing issues

Use the [issue templates](https://github.com/etoryoki/koji-lens/issues/new/choose):

- **Bug report** — for unexpected behavior, errors, or regressions
- **Feature request** — for new functionality or improvements

Before filing:

- Search [existing issues](https://github.com/etoryoki/koji-lens/issues?q=is%3Aissue) (open and closed) — duplicates slow everyone down
- For bugs, include: koji-lens version (`koji-lens --version`), Node.js version, OS, and a minimal reproduction

## Proposing changes

### Before opening a PR

- **For non-trivial changes**, please open an issue first to discuss the approach. We'd rather align on direction before you invest implementation time
- For typo / docs / small bug fixes, jump straight to a PR

### Local setup

```bash
git clone https://github.com/etoryoki/koji-lens.git
cd koji-lens
pnpm install              # pnpm 9.x required
```

### Build & test

```bash
# Workspace-aware order (apps/cli depends on apps/web's standalone output)
pnpm --filter @kojihq/core build
pnpm --filter @kojihq/web build
pnpm --filter @kojihq/lens build

# Tests
pnpm test                 # vitest, 25/25 pass expected

# Type checking
pnpm -r typecheck

# CLI smoke test (after building)
node apps/cli/dist/index.js summary --since 24h
node apps/cli/dist/index.js serve --port 3210
```

### Code style

- TypeScript strict mode is on; please keep it that way
- Use existing patterns (zod for schema, drizzle for SQL, Tailwind for styling)
- No comments unless they explain *why* something non-obvious is the way it is

### PR checklist

- [ ] Tests pass (`pnpm test`)
- [ ] Type check passes (`pnpm -r typecheck`)
- [ ] Build succeeds (workspace order above)
- [ ] CHANGELOG.md updated for user-visible changes
- [ ] Commit messages follow the existing style (`feat(scope):` / `fix(scope):` / `chore(scope):` / `docs(scope):`)

## Architecture overview

```
koji-lens/
├── packages/
│   └── core/              # Pure logic: zod parser, aggregation, pricing
│   └── ccsg-poc/          # Experimental: Claude Code Security Gateway PoC (Day 45 evaluation only)
├── apps/
│   ├── cli/               # @kojihq/lens CLI (commander)
│   ├── web/               # Web dashboard (Next.js 16 standalone, bundled into CLI)
│   └── lp/                # https://lens.kojihq.com (separate Vercel deploy)
└── scripts/               # OG image build, Bluesky posting, survey, etc.
```

The CLI ships with the web dashboard pre-built. `koji-lens serve` runs the bundled Next.js server locally.

## Issue triage policy

We aim to respond to issues within **5 business days**. Issues without a clear repro or feature use case may be closed with a request for more context — please don't take this personally.

## Code of Conduct

This project follows the [Contributor Covenant](./CODE_OF_CONDUCT.md). Be kind, assume good intent, and disagree constructively.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).

---

Questions not covered here? Email <support@kojihq.com> or DM [@kojihq.com on Bluesky](https://bsky.app/profile/kojihq.com).
