<!-- Thanks for contributing to koji-lens! -->

## Summary

<!-- One paragraph: what does this PR change, and why? -->

## Linked issue

<!-- e.g., Fixes #123 / Closes #45 / Related to #67 -->
<!-- For non-trivial changes, please open an issue first to align on direction (see CONTRIBUTING.md) -->

## Type of change

- [ ] Bug fix (non-breaking)
- [ ] Feature (non-breaking)
- [ ] Breaking change
- [ ] Documentation only
- [ ] Refactor / chore (no functional change)

## Testing

<!-- How did you verify this works? Include the actual commands you ran. -->

```bash
# e.g.,
pnpm --filter @kojihq/core typecheck
pnpm test
node apps/cli/dist/index.js summary --since 24h
```

## Checklist

- [ ] Tests pass: `pnpm test`
- [ ] Type check passes: `pnpm -r typecheck`
- [ ] Build succeeds in workspace order:
  ```bash
  pnpm --filter @kojihq/core build
  pnpm --filter @kojihq/web build
  pnpm --filter @kojihq/lens build
  ```
- [ ] CHANGELOG.md updated for user-visible changes
- [ ] No prompt body content / personal data persisted in tests or examples
- [ ] Commit messages follow `feat(scope):` / `fix(scope):` / `chore(scope):` / `docs(scope):` style

## Screenshots / output

<!-- For UI / CLI output changes, include before/after if relevant -->
