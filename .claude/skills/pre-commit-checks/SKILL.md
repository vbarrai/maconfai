---
name: pre-commit-checks
description: Enforce running all checks before any git commit or git push
user-invocable: false
---

# Pre-commit checks

Before executing any `git commit` or `git push` command, you MUST run the following checks in order and ensure they all pass:

1. `pnpm typecheck` — TypeScript type checking
2. `pnpm lint` — Lint with oxlint
3. `pnpm prettier` — Check formatting
4. `npx vitest run` — Run all tests

If any check fails, do NOT proceed with the commit or push. Fix the issues first, then re-run all checks before retrying.
