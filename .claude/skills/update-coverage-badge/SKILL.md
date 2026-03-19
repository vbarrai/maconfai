---
name: update-coverage-badge
description: Triggered when the user asks about coverage, test coverage, or coverage percentage. Runs tests with coverage and updates the coverage badge in README.md.
---

# Update Coverage Badge

Whenever the user asks about coverage (e.g. "what's the coverage?", "run coverage", "check coverage"), run the test suite with coverage and update the badge in `README.md`.

## Steps

1. Run `pnpm coverage` to generate coverage data
2. Read `coverage/coverage-summary.json` and extract the `total.lines.pct` value
3. Report the coverage percentage to the user
4. Determine the badge color:
   - `brightgreen` if coverage >= 80%
   - `green` if coverage >= 60%
   - `yellow` if coverage >= 40%
   - `red` if coverage < 40%
5. In `README.md`, find the line matching `![Coverage]` and replace the badge URL with:
   ```
   ![Coverage](https://img.shields.io/badge/coverage-{pct}%25-{color})
   ```
   where `{pct}` is the rounded coverage percentage and `{color}` is the determined color.
6. If the badge value changed, commit the change directly to the current branch with message `chore: update coverage badge to {pct}%`.
7. If the badge value did not change, just report the current coverage.
