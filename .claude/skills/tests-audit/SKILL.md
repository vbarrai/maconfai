---
name: tests-audit
version: 1.1.0
description: >-
  TRIGGER when the user asks to check test coverage gaps, find missing tests, outdated tests,
  tests to remove, or audit the test suite against source code and documentation. After producing
  the report, this skill applies the High/Medium-priority fixes, opens a pull request from `main`,
  and enables auto-merge so it lands once CI is green.
  DO NOT TRIGGER for running tests, writing new tests, or fixing failing tests.
allowed-tools: Read, Glob, Grep, Edit, Write, Bash, Agent
disable-model-invocation: true
---

# Test Suite Audit Skill

You are a test auditor for **maconfai**. Compare the current test suite against the project documentation (CLAUDE.md, docs/agents-config/) and source code (src/) to identify missing, outdated, or unnecessary tests. Once the report is produced, apply the actionable fixes and open a pull request from `main` with auto-merge enabled — the same flow the `docs-audit` skill uses.

**Order of operations is strict: audit first (read-only), then apply.** Never edit or create test files until Steps 1–5 have produced a concrete report. The PR step (Step 6) is a follow-on, not the entry point.

## Project Context

maconfai is a CLI tool that installs agent configurations (skills, MCP servers, hooks) from GitHub repos or local directories to multiple AI coding agents.

### Agents Implemented (from `src/agents.ts`)

| Agent       | Skills | MCP                        | Hooks                                |
| :---------- | :----- | :------------------------- | :----------------------------------- |
| claude-code | Yes    | Yes (bare `${VAR}`)        | Yes (`.claude/settings.json` format) |
| cursor      | Yes    | Yes (`${env:VAR}` prefix)  | Yes (`.cursor/hooks.json` dedicated) |
| codex       | Yes    | Yes (`.codex/config.toml`, bare `${VAR}`) | Yes (`.codex/hooks.json`, settings format) |
| open-code   | Yes    | Yes (opencode.json format) | No                                   |

### Source Modules and Their Exports

| Module                 | Key exports                                                                                                                                       |
| :--------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/install.ts`       | `runInstall()` — interactive CLI orchestrator                                                                                                     |
| `src/installer.ts`     | `installSkill()`, `uninstallSkill()`, `listInstalledSkills()`, `sanitizeName()`                                                                   |
| `src/mcp.ts`           | `translateEnvVar()`, `translateServerConfig()`, `installMcpServers()`, `uninstallMcpServers()`, `listInstalledMcpServerNames()`                   |
| `src/hooks.ts`         | `installHooks()`, `installHookFiles()`                                                                                                            |
| `src/lock.ts`          | `readLock()`, `writeLock()`, `addToLock()`, `addMcpToLock()`, `addHookToLock()`, `removeFromLock()`, `fetchSkillFolderHash()`, `getGitHubToken()` |
| `src/skills.ts`        | `parseSkillMd()`, `discoverSkills()`, `discoverMcpServers()`, `discoverMcpDirs()`, `discoverHooks()`, `discoverHookDirs()`                        |
| `src/check.ts`         | `runCheck()` — interactive update checker                                                                                                         |
| `src/source-parser.ts` | `parseSource()`, `getOwnerRepo()`                                                                                                                 |
| `src/git.ts`           | `cloneRepo()`, `cleanupTempDir()`, `getTreeHash()`                                                                                                |
| `src/agents.ts`        | `detectInstalledAgents()`, `agents` record                                                                                                        |
| `src/cli.ts`           | Entry point (routes: install, check, update)                                                                                                      |

### Test Conventions (from CLAUDE.md)

- 1 test per file, 30-100 lines
- Use `describeConfai` wrapper from `tests/test-utils.ts`
- Prefer inline snapshots (`toMatchInlineSnapshot`)
- Use `targetFiles()` for file tree, `targetFile(path)` for content
- Tests run CLI as subprocess (real execution, no mocks)
- Each test gets isolated temp directory
- Given-When-Then pattern

### Test Helpers Available

From `describeConfai`:

- `givenSource({ skills?, mcps?, mcpDirs?, hooks?, hookDirs?, hookDirFiles? })`
- `givenSkill(...names)` — shorthand for skills-only
- `whenInstall({ skills?, agents?, mcps?, hooks?, extraArgs? })`
- `targetFiles()` — sorted file list
- `targetFile(path)` — file content
- `targetHasFiles(...paths)` — existence check
- `targetHasNoFiles(...paths)` — absence check
- `thenMcpConfig(path)` — parse JSON config
- `sourceFiles()` — list source fixtures

Fixtures: `skillFile()`, `mcpGithub`, `mcpGithubWithEnv`, `mcpLinear`, `mcpLinearUrl`, `mcpCustomApi`, `hookBlockRm`, `hookBlockRmClaudeCode`, `hookBlockRmCursor`, `hookLintOnEdit`

## Audit Procedure

### Step 1 — Inventory Current Tests

1. `Glob` for all `tests/**/*.test.ts` files
2. Group by directory: `install/`, `lock/`, `check/`, `claude-code/`, `cursor/`, `open-code/`, root
3. Count files per group

### Step 2 — Read the Source Code

For each module in `src/`, read:

- Exported functions and their signatures
- Code paths (if/else branches, agent-specific logic)
- Features that should have test coverage

### Step 3 — Read the Documentation

For each doc in `docs/agents-config/`, extract:

- Features described as supported by maconfai
- Configuration formats, field names, edge cases
- Agent-specific behaviors

### Step 4 — Cross-reference and Find Gaps

Compare tests against source + docs to identify:

#### A. Missing Tests

1. **Missing agent coverage** — a feature is implemented for an agent but has no per-agent tests
   - Example: if open-code gains hook support, it needs `tests/open-code/hooks/` tests
   - Example: codex has skill support but no `tests/codex/` directory
2. **Missing feature tests** — a source function has no corresponding test
   - Example: `discoverHookDirs()` has no unit test
3. **Missing edge case tests** — a documented edge case is not tested
   - Example: `${VAR:-default}` syntax for env var defaults
4. **Missing combination tests** — features that interact but are not tested together
   - Example: skills + MCPs + hooks installed simultaneously for a specific agent

#### B. Outdated Tests

1. **Wrong snapshot values** — test expects output that no longer matches the current implementation
2. **Renamed helpers** — test uses helpers that have been renamed or removed from test-utils
3. **Changed agent config** — an agent's config paths changed in `src/agents.ts` but tests still use old paths
4. **Deprecated features** — test covers a feature that was removed from the source

#### C. Tests to Remove

1. **Dead tests** — test file exists but the feature it covers was removed
2. **Duplicate coverage** — two tests assert the same thing
3. **Tests for non-existent agents** — test directory for an agent not in `src/agents.ts`

#### D. Tests Violating Conventions

1. **Too long** (> 100 lines) or **too short** (< 10 lines)
2. **Multiple `it()` blocks** in a single file (should be 1 test per file)
3. **Not using `describeConfai`** when it should (E2E tests)
4. **Manual assertions** instead of inline snapshots where snapshots would be clearer
5. **Missing from CLAUDE.md test tree** — test exists but is not listed in the documented tree

### Step 5 — Check CLAUDE.md Accuracy

Verify that the test tree documented in CLAUDE.md matches reality:

- Files listed in CLAUDE.md that don't exist on disk
- Files on disk that are not listed in CLAUDE.md
- Test counts that are wrong

## Report Format

### Executive Summary

```
Tests: X files found
- Missing: Y tests needed
- Outdated: Z tests need update
- To remove: W tests can be deleted
- Convention violations: V issues
- CLAUDE.md drift: U discrepancies
```

### Detailed Findings

Group by category (Missing / Outdated / To remove / Convention violations / CLAUDE.md drift), then by agent.

For each finding:

```
#### <Category> — <Agent> / <Feature>

**File**: `tests/<path>` (or "missing")
**Issue**: <what is wrong>
**Evidence**: <reference to source code or documentation>
**Recommended action**: <specific fix — create file, update snapshot, delete file, etc.>
**Priority**: High (affects supported feature) | Medium (reference docs) | Low (convention)
```

### Prioritized Action List

End with a numbered list of all actions, sorted by priority:

1. High priority — missing tests for supported features
2. Medium priority — outdated tests, CLAUDE.md drift
3. Low priority — convention violations, cosmetic issues

## Step 6 — Apply fixes and open a pull request

After presenting the report, apply the actionable findings, open a PR from `main`, and enable auto-merge so it lands once CI is green. If the prioritized action list contains **no** High or Medium item that requires a file change (e.g. everything is `Up to date`, or only Low/"no action" convention items remain), skip this step and stop after the report.

### What to apply

Apply only the **High and Medium** priority actions that map to a concrete file change:

- **Missing tests** → create the test file, following the project's conventions (1 test per file, 30–100 lines, `describeConfai`, inline snapshots, Given-When-Then). Model each new file on the closest existing sibling (e.g. a missing `tests/<agent>/mcp/uninstall-single.test.ts` mirrors an existing one for another agent).
- **Outdated tests** → update the wrong snapshot/assertion to match current source behavior.
- **Tests to remove** → delete the dead/duplicate file.
- **CLAUDE.md drift** → update the documented test tree (add missing files, remove stale entries, fix wrong descriptions/counts).

Do **not** apply Low-priority/"no action recommended" convention items (e.g. leaving legacy multi-`it()` files as-is). Every edit in the PR must trace back to a specific finding in the report — no drive-by changes.

### Procedure

1. **Show the report first.** Present the executive summary and prioritized action list before touching any files, so the user knows what the PR will contain.
2. **Branch from `main`.** Confirm a clean working tree (`git status`), then `git fetch origin` and `git checkout -b tests/audit-YYYY-MM-DD origin/main` (today's date; append `-2`, `-3`, … if the branch exists).
3. **Apply the edits** described above — nothing more.
4. **Run the gate locally — before opening the PR.** Invoke the **`pre-commit-checks`** skill: it runs `typecheck` + `lint` + `prettier` (auto-fix the files you touched with `pnpm prettier:format` first) + the full test suite (`pnpm test -- --run`) **and** the package version-availability check (`./scripts/version-check.sh`). The PR auto-merges on a green run (step 7), so it must already be green.

   - New tests must pass. If a test you added fails, fix it (or the snapshot) before proceeding — **never open a red PR**. If a failure stems from a real source bug the test exposes, stop and surface it rather than weakening the test to make it pass.
   - If `version-check.sh` fails (the `package.json` version is already on npm), **auto-bump a patch** so the PR can merge unattended: `pnpm version patch --no-git-tag-version`, then re-run `./scripts/version-check.sh` to confirm it exits 0. Stage `package.json` (and `pnpm-lock.yaml` if changed) so the bump rides with this PR. See the `bump-package-version` skill for the rationale and when a `minor` bump is warranted instead.
5. **Commit.** One commit, message `test: audit and refresh test suite (YYYY-MM-DD)`. List affected files and a one-line summary of each change in the body. Include formatting-only changes from `pnpm prettier:format` and any `package.json` version bump from step 4 in the same commit.
6. **Push and open the PR** with `gh pr create --base main`. Embed the full report (executive summary + detailed findings + action list) in the PR body so reviewers see the evidence behind every edit. Title: `test: refresh test suite (YYYY-MM-DD audit)`.
7. **Enable auto-merge** so the PR merges into `main` on its own once CI is green: `gh pr merge --auto --squash`. `main` is protected by required status checks but no longer requires a human review, so a passing CI run is the only gate. Because step 4 already ran the gate locally, CI should be green on the first run. If CI fails anyway, the PR stays open for a human — auto-merge never merges a red PR.
8. **Return the PR URL** to the user, noting it will auto-merge when CI passes.

If any step fails (dirty working tree, push rejected, `gh` not authenticated, auto-merge not enabled on the repo), stop and surface the error — do not work around it. The audit report itself is still valuable even without the PR.

## Important Rules

- **Audit before editing.** Never modify or create test files until Steps 1–5 have produced a concrete report. Step 6 is a follow-on.
- **Only apply what the report justifies.** Each edit in the PR must trace back to a specific finding with source/doc evidence. No drive-by reformatting or "while I'm here" cleanups.
- **Read the actual source code** — do not rely solely on documentation. The code is the truth.
- **Be precise** — quote line numbers, function names, and file paths.
- **Check both directions** — tests without source AND source without tests.
- **Distinguish unit vs E2E** — some features are tested at the integration level in `tests/install/` and don't need isolated unit tests. Flag this explicitly, and do not create redundant unit tests for them.
- **Never open a red PR.** The local CI gate (step 4) must be green first; new tests must pass.
