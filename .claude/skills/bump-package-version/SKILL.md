---
name: bump-package-version
version: 1.0.0
description: >-
  TRIGGER when the `version-check` gate fails — i.e. the version in package.json is already
  published on npm and a commit/PR/merge is blocked, or when `scripts/version-check.sh` exits
  non-zero. Explains how to choose and apply the right semver bump to package.json so the gate
  passes. DO NOT TRIGGER for cutting a full release/tag (use the `release` skill for that).
allowed-tools: Read, Edit, Bash
user-invocable: true
---

# Bump package.json version

The `version-check` gate (`scripts/version-check.sh`, run in CI and by the `pre-commit-checks` skill) fails when the `version` in `package.json` is **already published on npm**. Because every merge to `main` must carry an unpublished version, you must bump `package.json` before the commit/PR can land. This skill explains how to pick the right bump and apply it.

## When this fires

You'll see an error like:

```
::error::Version 0.6.0 is already published on npm — bump the version in package.json before merging
```

That means npm already has `maconfai@<version>`. The fix is always the same shape: raise the version to one that is not yet published.

## Step 1 — Confirm the failure and see what's published

```bash
./scripts/version-check.sh            # reproduces the gate; exits 1 if blocked
node -p "require('./package.json').version"   # current local version
npm view maconfai version             # latest published version
npm view maconfai versions --json     # every published version (to avoid collisions)
```

If `version-check.sh` exits 0, there is nothing to do — stop here.

## Step 2 — Choose the bump level (semver, pre-1.0)

maconfai is **pre-1.0**, so the usual semver "breaking = major" rule is relaxed: breaking changes ride in **minor** bumps, and you must call them out loudly even so. Pick the smallest level that fits the change set since the last published version:

| Level     | Command                  | Use when…                                                                       |
| :-------- | :----------------------- | :------------------------------------------------------------------------------ |
| **patch** | `pnpm version patch …`   | Bug fixes, docs, tests, internal refactors — **no** behavior or API change. Default. |
| **minor** | `pnpm version minor …`   | New user-facing feature, new flag/agent, **or any breaking change / changed default** (pre-1.0). |
| **major** | `pnpm version major …`   | Only once intentionally going to / past 1.0. Rare — confirm with the user first. |

**Default to `patch`** when the change is docs/tests/chore-only (e.g. an audit PR). Choose `minor` if the diff adds or changes user-facing behavior. If a change is breaking, flag it explicitly in the commit/PR body even within a minor bump.

When unsure between patch and minor, look at the diff: if a maconfai user's existing command would behave differently, it's at least a minor.

## Step 3 — Apply the bump (no tag, no commit)

Use `--no-git-tag-version` so this only edits `package.json` (and `pnpm-lock.yaml` if present) — it must **not** create a git tag or commit. Tagging is the `release` skill's job, not this one.

```bash
pnpm version patch --no-git-tag-version    # or minor / major
```

This rewrites `package.json` `version` in place. Verify, then re-run the gate:

```bash
./scripts/version-check.sh                 # must now print "… is available on npm" and exit 0
```

## Step 4 — Stage the bump

Stage `package.json` (and `pnpm-lock.yaml` if it changed) so it rides with the commit/PR that triggered the gate:

```bash
git add package.json pnpm-lock.yaml 2>/dev/null || git add package.json
```

Do **not** make a standalone "bump version" commit when this bump is part of a larger PR — fold it into that PR's commit. The version bump and the changes it ships should land together.

## Guardrails

- **One bump per merge.** Only raise the version high enough to clear the gate (almost always a single patch). Do not jump multiple versions to "leave room".
- **Never tag here.** This skill stops at editing `package.json`. Tagging + publishing is the `release` skill (a `v*` tag triggers `.github/workflows/publish.yml`, whose `preflight` requires the tag to equal `package.json`).
- **Breaking changes are loud.** Pre-1.0 lets breaking changes ride a minor bump, but they must still be called out in the PR/commit body.
- **Re-run the gate before pushing.** `scripts/version-check.sh` must exit 0; otherwise the PR will be red on `main` after merge.
