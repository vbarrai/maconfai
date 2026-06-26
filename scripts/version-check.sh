#!/usr/bin/env bash
#
# version-check.sh — fail if the version in package.json is already published on npm.
#
# This is the single source of truth for the `version-check` gate. It runs in two places:
#   1. CI (.github/workflows/ci.yml, on pushes to main)
#   2. Locally, via the pre-commit-checks skill, before any push/PR
#
# Exit codes:
#   0 — the version is NOT yet on npm (safe to merge/release)
#   1 — the version is already published (bump package.json before merging)
#
# Output uses GitHub's `::error::` annotation syntax, which is harmless when run locally.
# When this fails, follow the `bump-package-version` skill to choose and apply a bump.
set -euo pipefail

PKG_NAME=$(node -p "require('./package.json').name")
PKG_VERSION=$(node -p "require('./package.json').version")

if npm view "${PKG_NAME}@${PKG_VERSION}" version >/dev/null 2>&1; then
  echo "::error::Version ${PKG_VERSION} is already published on npm — bump the version in package.json before merging"
  echo "Fix it with: pnpm version <patch|minor|major> --no-git-tag-version  (see the bump-package-version skill)"
  exit 1
fi

echo "Version ${PKG_VERSION} of ${PKG_NAME} is available on npm"
