---
name: pre-commit-checks
description: Use when you want to commit and push modifications, or create a pull request. Enforces running all checks before any git commit, git push, or PR creation.
user-invocable: false
---

# Pre-commit checks

Before executing any `git commit` or `git push` command, you MUST run the following checks in order and ensure they all pass:

1. `pnpm typecheck` — TypeScript type checking
2. `pnpm lint` — Lint with oxlint
3. `pnpm prettier` — Check formatting (if it fails, run `pnpm prettier:format` to auto-fix)
4. `npx vitest run` — Run all tests

If any check fails, do NOT proceed with the commit or push. Fix the issues first, then re-run all checks before retrying.

# Branch protection

You MUST NEVER push directly to the `main` or `master` branch. If the current branch is `main` or `master`, refuse the push and ask the user to create a feature branch first.
