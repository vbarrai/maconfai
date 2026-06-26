# CLAUDE.md

## Project

maconfai — Universal configuration installer for AI coding agents (Claude Code, Cursor, Codex, Gemini CLI, Amp Code, Open Code).
CLI tool to install, update, and uninstall any type of agent configuration from GitHub repos or local directories, using a single source of truth.

## Stack

- TypeScript (ESM, `"type": "module"`)
- Node.js >= 18
- Package manager: pnpm
- Build: obuild
- Tests: vitest
- CLI prompts: @clack/prompts
- Git operations: simple-git
- Formatting: prettier
- Linting: oxlint
- Dead code: knip

## Commands

- `pnpm test` — Run tests (vitest)
- `npx vitest run` — Run tests once (no watch)
- `pnpm build` — Build with obuild
- `pnpm typecheck` — TypeScript type checking (`tsc --noEmit`)
- `pnpm lint` — Lint with oxlint
- `pnpm knip` — Detect unused files, exports, and dependencies
- `pnpm run dev` — Run CLI in dev mode (`node --experimental-strip-types src/cli.ts`)
- `pnpm prettier` — Check formatting (CI)
- `pnpm prettier:format` — Format all files with Prettier
- `./scripts/version-check.sh` — Fail if `package.json` version is already published on npm (the `version-check` CI gate; also run by the `pre-commit-checks` skill before push/PR). Fix a failure with the `bump-package-version` skill.

## Release

Project-specific facts the `release` skill relies on (the skill is generic; the specifics live here):

- **Trigger**: pushing a `v*` git tag triggers `.github/workflows/publish.yml`. There is no manual publish step.
- **CI pipeline** (`publish.yml`): `preflight` fails the run if the tag (minus the `v` prefix) ≠ `package.json` version → lint/typecheck/test → `pnpm build` → `npm publish --access public` → `gh release create --generate-notes`.
- **Version source of truth**: `package.json` `version`. Bump with `pnpm version <major|minor|patch>` on `main` **before** tagging (CI compares the tag against `package.json` on the tagged commit).
- **Tag format**: `vX.Y.Z` (annotated), pushed from `main`.
- **Pre-release gate**: `pnpm ci` (= `check` + `test --run` + `build`) is the same gate CI runs — run it locally before tagging so failures surface before the tag is pushed.
- **Versioning**: semver, pre-1.0 — flag any breaking change or changed default loudly, even in a minor bump.
- **Changelog**: lives on the GitHub release only (no `CHANGELOG.md` file in the repo). The skill overwrites CI's auto-generated notes with a curated changelog via `gh release edit --notes-file`.
- **Tag commands**: `git tag -a vX.Y.Z -m vX.Y.Z && git push origin vX.Y.Z`; undo before publish with `git push --delete origin vX.Y.Z && git tag -d vX.Y.Z` (a published npm version is permanent).

## Project structure

- `src/cli.ts` — CLI entry point (argument parsing)
- `src/install.ts` — Main install command logic
- `src/installer.ts` — Low-level install/uninstall skill functions
- `src/skills.ts` — Skill discovery (finds SKILL.md files)
- `src/agents.ts` — Agent definitions and detection
- `src/types.ts` — Shared types (`AgentType`, `Skill`, `AgentConfig`)
- `src/git.ts` — Git clone/fetch helpers
- `src/source-parser.ts` — Parses source arguments (GitHub URLs, owner/repo, local paths)
- `src/lock.ts` — Lock file management
- `src/check.ts` — Update checking
- `src/mcp.ts` — MCP server config install/uninstall and env var translation
- `src/hooks.ts` — Hooks config install/uninstall (agent-specific event handlers) and companion file copying
- `tests/test-utils.ts` — Test helpers (`setupScenario`, `skillFile`)
- `tests/install.test.ts` — E2E tests for install/uninstall
- `tests/installer.test.ts` — Unit tests for installer
- `tests/mcp.test.ts` — Unit tests for MCP module
- `tests/sanity.test.ts` — Sanity check tests

## Key concepts

- **Agents**: `claude-code`, `cursor`, `codex`, `gemini-cli`, `amp-code`, `open-code` (type `AgentType`)
- **Skills**: Discovered via a waterfall strategy (first match wins):
  1. `skills/<name>/SKILL.md` — multi-skill repo with a `skills/` wrapper directory
  2. `skills/<name>.yml` — remote skill reference; file content is either a plain source string or a YAML document with `source`, `include`, and `prefix` fields. Supports `owner/repo/subpath` and `owner/repo#branch` formats. The lock tracks the **remote** source so updates pull from the original repo.
  3. `<name>/SKILL.md` — multi-skill repo with skills directly at root level (skips `.`-prefixed dirs, `mcps`, `hooks`, `skills`)
  4. `SKILL.md` at root — single-skill repo
- **Canonical dir**: `.agents/skills/<name>/` — single source of truth for skill files
- **Agent dirs**: `.claude/skills/`, `.cursor/skills/`, `.codex/skills/`, `.gemini/skills/`, `.amp/skills/` — symlinked to canonical dir
- **MCP servers**: Defined in `mcps/<name>/mcp.json` directories or root `mcp.json`, merged into agent config files (`.mcp.json` for Claude Code, `.cursor/mcp.json` for Cursor, `opencode.json` for Open Code)
- **Hooks**: Defined in `hooks/<name>/hooks.json` directories or root `hooks.json`, merged into agent config files (`.claude/settings.json` for Claude Code, `.cursor/hooks.json` for Cursor, `.codex/hooks.json` for Codex). Codex uses the `settings` format (same `{ hooks: {...} }` shape as Claude Code, no `version` wrapper). Companion files (scripts, configs) in `hooks/<name>/` are automatically copied to `.agents/hooks/<name>/`
- **Trusted**: Per-config `trusted?: boolean` in `ai-lock.json` (on every skill/MCP/hook entry), set installer-side (never declared by the source). Gates `maconfai update`: trusted configs update blindly; non-trusted configs are **blocked** (reported, not changed); `update --include-untrusted` updates all. The gate rule is `trusted !== false` — a **missing** `trusted` (entries installed before the field existed) is grandfathered as trusted. New installs default to non-trusted; `--trusted` or the interactive prompt opts in. `add{,Mcp,Hook}ToLock` preserve `trusted` when the caller omits it (so update never resets it); `install.ts:resolveTrust` defaults new configs to non-trusted while preserving a reinstalled config's existing trust.
- **CLI flags**: `-y`/`--yes` (skip prompts), `--trusted` (mark installed configs trusted), `--skills=a,b` (filter skills), `--agents=claude-code,cursor` (filter agents), `--mcps=mcp1,mcp2` (filter MCP servers), `--hooks=hook1,hook2` (filter hooks), `--include-untrusted` (on `update`: bypass the trust gate)

## Testing conventions

### Rules

- **1 test per file**, between 30 and 100 lines — small, visual, focused
- Use `describeConfai` from `tests/test-utils.ts` — it wraps `setupScenario()` + `beforeEach(init)` + `afterEach(cleanup)` automatically
- Prefer **inline snapshots** (`toMatchInlineSnapshot`) over manual assertions — the test should read like a visual spec
- Use `targetFiles()` to assert the full file tree, `targetFile(path)` to assert file content
- Tests run the actual CLI via `node --experimental-strip-types` as a subprocess
- Each test gets an isolated temp directory (source + target)

### File tree

Tests mirror the feature they cover: `tests/<agent>/<feature>/<case>.test.ts`

```
tests/
  test-utils.ts                          # describeConfai, givenSource, when, targetFile, targetFiles
  install.test.ts                        # E2E tests for install/uninstall flow
  installer.test.ts                      # Unit tests for low-level installer
  mcp.test.ts                            # Unit tests for MCP module
  source-parser.test.ts                  # Unit tests for source parser
  install-choices.test.ts                # Interactive prompt choices test
  sanity.test.ts                         # Sanity checks
  install/
    discover-skills-dir.test.ts           # Discovery: skills/<name>/SKILL.md layout
    discover-root-dirs.test.ts            # Discovery: <name>/SKILL.md layout
    discover-root-single.test.ts          # Discovery: root SKILL.md layout
    single-skill-single-agent.test.ts    # One skill → one agent
    single-skill-all-agents.test.ts      # One skill → all agents
    multiple-skills-single-agent.test.ts # Many skills → one agent
    multiple-skills-multiple-agents.test.ts # Many skills → many agents
    filter-skills.test.ts                # --skills flag filtering
    filter-agents.test.ts                # --agents flag filtering
    filter-mcps.test.ts                  # --mcps flag filtering
    filter-hooks.test.ts                 # --hooks flag filtering
    skill-with-mcp.test.ts              # Skill + MCP bundled
    skill-with-hooks.test.ts             # Skill + hooks bundled
    standalone-mcp.test.ts               # MCP-only install (no skills)
    standalone-hooks.test.ts             # Hooks-only install (no skills)
    combined-skills-mcps-hooks.test.ts   # All three combined
    reinstall-same-skills.test.ts        # Reinstall idempotent
    reinstall-mcps-preserved.test.ts     # MCPs preserved on reinstall
    reinstall-hooks-preserved.test.ts    # Hooks preserved on reinstall
    reinstall-idempotent-combined.test.ts # Full reinstall idempotent
    switch-agent.test.ts                 # Change agent on reinstall
    add-agent.test.ts                    # Add agent to existing install
    uninstall-deselected-skill.test.ts   # Removed skill cleaned up
    uninstall-deselected-mcp.test.ts     # Deselected MCP cleaned up
    uninstall-deselected-hooks.test.ts   # Deselected hooks cleaned up
    uninstall-all-skills.test.ts         # Remove all skills
    cross-agent-uninstall.test.ts        # Uninstall across agents
    multi-agent-mcps.test.ts             # MCPs to multiple agents
    multi-agent-hooks.test.ts            # Hooks to multiple agents
    sequential-different-providers.test.ts # Two providers sequentially
    sequential-hooks-merge.test.ts       # Sequential hook installs merge
    hooks-only-then-add-skills.test.ts   # Hooks first, skills later
    mcps-only-then-add-skills.test.ts    # MCPs first, skills later
    lock-tracks-skills.test.ts           # ai-lock.json tracks skills
    lock-tracks-mcps.test.ts             # ai-lock.json tracks MCPs
    lock-tracks-hooks.test.ts            # ai-lock.json tracks hooks
    lock-tracks-all-three.test.ts        # ai-lock.json tracks all
    lock-removes-deselected-skill.test.ts # Lock cleaned on deselect
    lock-hash-empty-for-local.test.ts    # No hash for local sources
    trusted-flag.test.ts                 # --trusted writes trusted: true
    trusted-default-untrusted.test.ts    # New installs default to trusted: false
    trusted-preserved-on-reinstall.test.ts # -y reinstall keeps existing trust
    remote-ref-basic.test.ts            # Remote ref: basic install via skills/<name> file
    remote-ref-mixed.test.ts            # Remote ref: mix of local and remote ref skills
    remote-ref-filter.test.ts           # Remote ref: --skills filter applies to refs
    lock-tracks-remote-ref.test.ts      # Remote ref: lock tracks remote source, not proxy repo
    remote-ref-circular.test.ts        # Remote ref: circular reference is skipped with warning
    remote-ref-yaml-source-only.test.ts # Remote ref: YAML doc with only a source field
    remote-ref-yaml-prefix.test.ts      # Remote ref: YAML prefix field applied
    remote-ref-yaml-include-mcps.test.ts # Remote ref: YAML include filters to mcps
    remote-ref-yaml-include-prefix.test.ts # Remote ref: YAML include + prefix combined
    mcp-not-created-for-codex.test.ts    # Codex skips MCP config
    no-filter-selects-all.test.ts        # No filter = select everything
    nothing-to-do.test.ts               # Nothing to install
    yes-flag-all-agents.test.ts          # -y flag with all agents
  lock/
    lock-test-utils.ts                   # Lightweight lock test helpers
    read/
      valid-file.test.ts                 # Parses valid ai-lock.json
      missing-file.test.ts              # Returns empty lock if missing
      corrupted-json.test.ts             # Handles corrupt JSON
      missing-version.test.ts            # Handles missing version
      missing-skills.test.ts             # Handles missing skills key
    write/
      empty-lock.test.ts                 # Writes empty lock
      with-skills.test.ts               # Writes lock with skills
      overwrite.test.ts                  # Overwrites existing lock
    add/
      new-entry.test.ts                  # Adds new skill entry
      persists-to-disk.test.ts           # Verifies file write
      preserves-installed-at.test.ts     # Keeps original installedAt
      preserves-trust.test.ts            # Keeps trusted when update omits it
      preserves-updated-at-when-hash-unchanged.test.ts # Keeps updatedAt when hash unchanged
      optional-fields.test.ts            # Optional fields handled
      multiple-skills.test.ts            # Multiple skills in lock
    remove/
      existing-skill.test.ts             # Removes existing entry
      keeps-others.test.ts               # Other entries preserved
      non-existent.test.ts              # No-op for missing entry
      persists-to-disk.test.ts           # Verifies file write
    fetch-hash/
      matching-folder.test.ts            # Returns tree hash
      auth-header-with-token.test.ts     # Auth header sent
      auth-header-without-token.test.ts  # No auth when no token
      specified-ref-only.test.ts         # Uses specified ref
      fallback-main-master.test.ts       # Falls back main → master
      root-sha-empty-path.test.ts        # Root SHA for empty path
      strips-skill-md.test.ts            # Strips SKILL.md from path
      backslash-normalization.test.ts    # Normalizes backslashes
      folder-not-found.test.ts           # Returns null if not found
      tree-not-blob.test.ts              # Skips blob entries
      network-error.test.ts              # Handles network errors
    token/
      from-github-env.test.ts            # GITHUB_TOKEN env var
      prefers-github-over-gh.test.ts     # GITHUB_TOKEN > GH_TOKEN
      fallback-gh-env.test.ts            # Falls back to GH_TOKEN
      fallback-cli.test.ts              # Falls back to gh auth token
      empty-cli-output.test.ts           # Handles empty CLI output
      whitespace-cli-output.test.ts      # Trims CLI output
      all-fail.test.ts                   # Returns null if all fail
  check/
    all-up-to-date.test.ts               # No updates available
    updates-available.test.ts            # Updates detected
    hash-triggers-update.test.ts         # Hash change triggers update
    mixed-results.test.ts                # Some up-to-date, some not
    fetch-errors.test.ts                 # Handles fetch errors
    skip-no-hash.test.ts                 # Skips entries without hash
    no-skills.test.ts                    # No skills to check
    blocked-untrusted.test.ts            # Non-trusted configs blocked from update
    blocked-untrusted-mcp-hook.test.ts   # Gate also blocks non-trusted MCPs/hooks
    include-untrusted-updates.test.ts    # --include-untrusted updates non-trusted configs
    grandfathered-trusted.test.ts        # Missing trusted field = trusted (not blocked)
    cancel-update.test.ts                # User cancels update
    decline-update.test.ts               # User declines update
    multiple-updates.test.ts             # Multiple skills need update
    update-subprocess-fail.test.ts       # Update subprocess fails
    url-with-branch.test.ts              # URL with branch ref
    url-skill-path.test.ts              # URL with skill path
    url-strip-git.test.ts               # Strips .git from URL
    url-strip-trailing-slash.test.ts     # Strips trailing slash
    url-default-branch.test.ts           # Default branch detection
  claude-code/
    mcp/
      install-single.test.ts             # Single MCP server
      install-multiple.test.ts           # Multiple MCP servers
      install-env.test.ts                # ${VAR} kept bare (no translation)
      install-url.test.ts                # URL-based MCP (SSE transport)
      install-headers.test.ts            # URL + headers, env vars kept bare
      install-with-skill.test.ts         # MCP alongside a skill
      install-from-dir.test.ts           # MCP from mcps/<name>/mcp.json
      install-merge.test.ts              # Sequential installs merge MCPs
      install-skip-existing.test.ts      # Existing MCP name preserved
      install-none.test.ts               # Empty MCP list installs nothing
      install-preserve-manual.test.ts    # User-added MCP servers preserved on install
      uninstall-single.test.ts           # Removes one server from .mcp.json, preserves others
    hooks/
      install-single.test.ts             # Single hook group
      install-multiple.test.ts           # Multiple hook groups
      install-with-skill.test.ts         # Hooks alongside a SKILL.md
      install-from-dir.test.ts           # Hook from hooks/<name>/hooks.json
      install-dir-with-files.test.ts     # Hook dir with companion scripts
      install-dir-no-files.test.ts       # Hook dir without companion files
      install-merge.test.ts              # Sequential installs merge hooks
      install-skip-duplicate.test.ts     # Duplicate handlers not added twice
      update-force-replace.test.ts       # Force replaces a same-matcher handler (update path)
  cursor/
    mcp/
      install-single.test.ts             # Single MCP server
      install-multiple.test.ts           # Multiple MCP servers
      install-env.test.ts                # ${VAR} → ${env:VAR} translation
      install-env-default.test.ts        # ${VAR:-default} → ${env:VAR:-default}
      install-url.test.ts                # URL-based MCP (SSE transport)
      install-headers.test.ts            # URL + headers with env translation
      install-with-skill.test.ts         # MCP alongside a skill
      install-from-dir.test.ts           # MCP from mcps/<name>/mcp.json
      install-merge.test.ts              # Sequential installs merge MCPs
      install-skip-existing.test.ts      # Existing MCP name preserved
      install-none.test.ts               # Empty MCP list installs nothing
      install-preserve-manual.test.ts    # User-added MCP servers preserved on install
      uninstall-single.test.ts           # Removes one server from .cursor/mcp.json, preserves others
    hooks/
      install-single.test.ts             # Single hook group
      install-multiple.test.ts           # Multiple hook groups
      install-with-skill.test.ts         # Hooks alongside a SKILL.md
      install-from-dir.test.ts           # Hook from hooks/<name>/hooks.json
      install-dir-with-files.test.ts     # Hook dir with companion scripts
      install-dir-no-files.test.ts       # Hook dir without companion files
      install-merge.test.ts              # Sequential installs merge hooks
      install-skip-duplicate.test.ts     # Duplicate handlers not added twice
  codex/
    skills/
      install-single.test.ts             # Single skill to codex agent
    hooks/
      install-single.test.ts             # Single hook group into .codex/hooks.json
      install-multiple.test.ts           # Multiple hook groups
      install-with-skill.test.ts         # Hooks alongside a SKILL.md
      install-from-dir.test.ts           # Hook from hooks/<name>/hooks.json
      install-dir-with-files.test.ts     # Hook dir with companion scripts
      install-dir-no-files.test.ts       # Hook dir without companion files
      install-merge.test.ts              # Sequential installs merge hooks
      install-skip-duplicate.test.ts     # Duplicate handlers not added twice
    mcp/
      install-single.test.ts             # Single MCP in .codex/config.toml
      install-multiple.test.ts           # Multiple MCPs in config.toml
      install-env.test.ts                # ${VAR} kept bare in config.toml
      install-url.test.ts                # URL-based MCP in config.toml
      install-headers.test.ts            # Headers → http_headers/env_http_headers
      install-from-dir.test.ts           # MCP from mcps/<name>/mcp.json
      install-merge.test.ts              # Sequential installs merge in TOML
      install-skip-existing.test.ts      # Existing MCP name preserved
      install-none.test.ts               # Empty MCP list installs nothing
      uninstall-single.test.ts           # Removes one server from TOML, preserves others
  open-code/
    skills/
      install-single.test.ts             # Single skill to open-code agent
    mcp/
      install-single.test.ts             # Single MCP with opencode.json format
      install-multiple.test.ts           # Multiple MCPs in opencode.json
      install-env.test.ts                # ${VAR} → {env:VAR} translation in opencode.json
      install-url.test.ts                # URL-based MCP (remote type)
      install-headers.test.ts            # URL + headers, env vars kept bare
      install-with-skill.test.ts         # MCP alongside a skill
      install-from-dir.test.ts           # MCP from mcps/<name>/mcp.json
      install-merge.test.ts              # Sequential installs merge MCPs
      install-skip-existing.test.ts      # Existing MCP name preserved
      install-none.test.ts               # Empty MCP list installs nothing
      uninstall-single.test.ts           # Removes one server from opencode.json, preserves others
  lock/
    add/
      mcp-entry.test.ts                  # Adds new MCP server entry
      hook-entry.test.ts                 # Adds new hook entry
```

### Test anatomy

```typescript
import { it, expect } from "vitest";
import { describeConfai } from "../../test-utils.ts";

describeConfai("cursor / install single MCP", ({ givenSource, whenInstall, targetFile, targetFiles }) => {
  it("should install a simple mcp server", async () => {
    await givenSource({ mcps: { ... } });                    // given
    await whenInstall({ skills: [...], agents: [...] });     // when
    expect(await targetFiles()).toMatchInlineSnapshot(` // then — file tree
      [...]
    `);
    expect(await targetFile("...")).toMatchInlineSnapshot(` // then — file content
      "..."
    `);
  });
});
```

### Helpers (`describeConfai` provides)

- `givenSource({ skills?, remoteRefs?, mcps?, mcpDirs?, hooks?, hookDirs?, hookDirFiles? })` — creates source fixtures (skills with SKILL.md, `remoteRefs` creates extensionless `skills/<name>` ref files, root mcp.json, mcps/<name>/mcp.json dirs, root hooks.json, hooks/<name>/hooks.json dirs, companion files in hook dirs)
- `givenRemoteSkill(name)` — creates an isolated temp dir containing `skills/<name>/SKILL.md` and returns its path; used as the target for `remoteRefs`
- `givenRemoteRef(name, refTarget)` — creates an isolated temp dir containing a `skills/<name>` ref file pointing to `refTarget`; used to simulate a circular/chained remote reference
- `givenSkill(...names)` — shorthand for skills without MCP
- `whenInstall({ skills?, agents?, mcps?, hooks?, extraArgs? })` — runs the CLI with `-y` flag
- `targetFiles()` — returns sorted list of all files in target dir
- `targetFile(path)` — returns file content as string
- `then(fileTree)` — asserts multiple file contents
- `thenExists(path)` — checks file existence

## Knowledge base — Agent configuration reference

All agent-specific documentation lives in `docs/agents-config/`. Use these docs as the source of truth when implementing support for each agent.

### Structure

Files follow the pattern `docs/agents-config/[agent-name]/[feature-name].md`. Each file includes a maconfai support status banner.

| Agent           | skills        | hooks         | mcp           | context       | Other           |
| :-------------- | :------------ | :------------ | :------------ | :------------ | :-------------- |
| **Claude Code** | Supported     | Supported     | Not supported | Not supported | `sub-agents.md` |
| **Cursor**      | Supported     | Supported     | Not supported | Not supported | `rules.md`      |
| **Codex**       | Supported     | Supported     | Supported     | Not supported | —               |
| **Gemini CLI**  | Not supported | —             | Not supported | Not supported | —               |
| **Amp Code**    | Not supported | —             | Not supported | Not supported | —               |
| **Open Code**   | Supported     | Not supported | Supported     | Not supported | —               |

### Agent skills directory mapping

| Agent       | Project skills dir         | User skills dir                     | Canonical dir            |
| :---------- | :------------------------- | :---------------------------------- | :----------------------- |
| Claude Code | `.claude/skills/<name>/`   | `~/.claude/skills/<name>/`          | `.agents/skills/<name>/` |
| Cursor      | `.cursor/skills/<name>/`   | `~/.cursor/skills/<name>/`          | `.agents/skills/<name>/` |
| Codex       | `.codex/skills/<name>/`    | `~/.agents/skills/<name>/`          | `.agents/skills/<name>/` |
| Gemini CLI  | `.gemini/skills/<name>/`   | `~/.gemini/skills/<name>/`          | `.agents/skills/<name>/` |
| Amp Code    | `.agents/skills/<name>/`   | `~/.config/agents/skills/<name>/`   | `.agents/skills/<name>/` |
| Open Code   | `.opencode/skills/<name>/` | `~/.config/opencode/skills/<name>/` | `.agents/skills/<name>/` |

### Agent instruction files

| Agent       | Instruction file                     | Config file     | Config format |
| :---------- | :----------------------------------- | :-------------- | :------------ |
| Claude Code | `CLAUDE.md`                          | `settings.json` | JSON          |
| Cursor      | `.cursor/rules/*.mdc` + `AGENTS.md`  | Settings UI     | —             |
| Codex       | `AGENTS.md` (+ `AGENTS.override.md`) | `config.toml`   | TOML          |
| Gemini CLI  | `GEMINI.md` (configurable name)      | `settings.json` | JSON          |
| Amp Code    | `AGENTS.md` (fallback `CLAUDE.md`)   | `settings.json` | JSON          |
| Open Code   | `AGENTS.md` (fallback `CLAUDE.md`)   | `opencode.json` | JSON          |

### SKILL.md frontmatter (universal)

```yaml
---
name: skill-name # Required — identifier
description: What it does # Required — triggers implicit invocation
---
```

Agent-specific extras:

- **Claude Code**: frontmatter supports `disable-model-invocation`, `user-invocable`, `allowed-tools`, `model`, `context`, `agent`, `hooks`, `argument-hint`
- **Cursor**: frontmatter supports `disable-model-invocation`, `license`, `compatibility`, `metadata`
- **Codex**: `agents/openai.yaml` (interface, policy.allow_implicit_invocation, dependencies.tools)
- **Gemini CLI**: only `name` + `description` recognized; runtime control via `/skills enable|disable` (no agents/google.yaml)
- **Amp Code**: only `name` + `description` recognized (no invocation control)
- **Open Code**: frontmatter supports `name`, `description`, `license`, `allowed-tools`, `compatibility`, `metadata`

## Code style

- No semicolons (but TypeScript enforces where needed)
- Single quotes
- 2-space indentation
- Functional style, async/await throughout
- Imports use `.ts` extensions
