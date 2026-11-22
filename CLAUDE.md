# CLAUDE.md

## Project

maconfai — Universal configuration installer for AI coding agents.
CLI tool to install, update, and uninstall any type of agent configuration (skills, MCP servers, hooks) from GitHub repos or local directories, using a single source of truth.
It installs to Claude Code, Cursor, Codex and Open Code. Gemini CLI and Amp Code are documented in `docs/agents-config/` but maconfai does not install to them.

## Stack

- TypeScript (ESM, `"type": "module"`)
- Node.js >= 18
- Package manager: pnpm
- Build: obuild
- Tests: vitest
- CLI prompts: @clack/prompts
- Git operations: the `git` binary, through `child_process` (no git library)
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
- `pnpm check` — `typecheck` + `lint` + `prettier` + `knip`
- `pnpm run ci` — The full gate CI runs: `check` + `test --run` + `build`. Always `pnpm run ci`, never `pnpm ci`: pnpm keeps the bare `ci` name for a command of its own, so the script only runs through `run`.
- `pnpm coverage` — Run the tests once with coverage (`coverage/coverage-summary.json`)
- `./scripts/version-check.sh` — Fail if `package.json` version is already published on npm (the `version-check` CI gate; also run by the `pre-commit-checks` skill before push/PR). Fix a failure with the `bump-package-version` skill.

## Release

Project-specific facts the `release` skill relies on (the skill is generic; the specifics live here):

- **Trigger**: pushing a `v*` git tag triggers `.github/workflows/publish.yml`. There is no manual publish step.
- **CI pipeline** (`publish.yml`): `preflight` fails the run if the tag (minus the `v` prefix) ≠ `package.json` version → lint/typecheck/test → `pnpm build` → `npm publish --access public` → `gh release create --generate-notes`.
- **Version source of truth**: `package.json` `version`. Bump with `pnpm version <major|minor|patch>` on `main` **before** tagging (CI compares the tag against `package.json` on the tagged commit).
- **Tag format**: `vX.Y.Z` (annotated), pushed from `main`.
- **Pre-release gate**: `pnpm run ci` (= `check` + `test --run` + `build`) is the same gate CI runs — run it locally before tagging so failures surface before the tag is pushed.
- **Versioning**: semver, pre-1.0 — flag any breaking change or changed default loudly, even in a minor bump.
- **Changelog**: lives on the GitHub release only (no `CHANGELOG.md` file in the repo). The skill overwrites CI's auto-generated notes with a curated changelog via `gh release edit --notes-file`.
- **Tag commands**: `git tag -a vX.Y.Z -m vX.Y.Z && git push origin vX.Y.Z`; undo before publish with `git push --delete origin vX.Y.Z && git tag -d vX.Y.Z` (a published npm version is permanent).

## Project structure

- `src/cli.ts` — CLI entry point (command dispatch, `--help` text)
- `src/install.ts` — `install` command: the interactive install, and the interactive uninstall when no source is given
- `src/add-remove.ts` — `add skill|mcp|hook` and `remove skill|mcp|hook`: the scriptable commands, limited to the names they are given
- `src/check.ts` — `check` and `update` commands: update detection, trust gate, re-install
- `src/status.ts` — `status` command: read-only comparison of `ai-lock.json` with the disk
- `src/trust.ts` — `trust` and `untrust` commands: write the `trusted` field of lock entries
- `src/home-dir.ts` — Guard for a run in the home directory (refuse when nobody can answer, ask otherwise)
- `src/installer.ts` — Low-level install/uninstall skill functions
- `src/skills.ts` — Skill, MCP and hook discovery in a source
- `src/agents.ts` — Agent definitions and detection (`detectInstalledAgents` from `$HOME`, `detectProjectAgents` from the project)
- `src/types.ts` — Shared types (`AgentType`, `Skill`, `AgentConfig`)
- `src/git.ts` — Git clone, tree hashes (from a clone or from files on disk), credential redaction
- `src/source-parser.ts` — Parses source arguments (GitHub URLs, owner/repo, local paths)
- `src/lock.ts` — Lock file management, GitHub token lookup, GitHub tree hash fetch
- `src/mcp.ts` — MCP server config install/uninstall, per-agent format and env var translation, user-scope duplicate warning
- `src/hooks.ts` — Hooks config install/uninstall (agent-specific event handlers) and companion file copying
- `tests/test-utils.ts` — Test helpers (`describeConfai`, `setupScenario`, `skillFile`, fixtures)
- `tests/setup-fake-home.ts` — Vitest setup file: gives every test file an empty temp `HOME`
- `tests/<command>/` — One directory per command: `install/`, `add/`, `remove/`, `status/`, `trust/`, `check/`, `update/`
- `tests/<agent>/` — Per-agent MCP, hooks and skills tests: `claude-code/`, `cursor/`, `codex/`, `open-code/`
- `tests/lock/`, `tests/git/` — Unit tests for the lock and git modules
- `tests/install.test.ts`, `tests/installer.test.ts`, `tests/mcp.test.ts`, `tests/source-parser.test.ts`, `tests/agents.test.ts`, `tests/sanity.test.ts` — Module-level tests

## Key concepts

- **Agents**: `claude-code`, `cursor`, `codex`, `open-code` (type `AgentType`, defined in `src/agents.ts`). `--agents` also accepts the aliases `claude` and `opencode`. A first install picks the agents found in `$HOME`; once `ai-lock.json` has entries, the targets come from the project alone (lock + agent files in the project), so the result does not depend on who runs the install.
- **Skills**: Discovered via a waterfall strategy (first match wins):
  1. `skills/<name>/SKILL.md` — multi-skill repo with a `skills/` wrapper directory
  2. `skills/<name>.yml` — remote skill reference: a YAML file with a required `source` field and optional `include` and `prefix` fields. `source` supports `owner/repo/subpath` and `owner/repo#branch` formats. The lock tracks the **remote** source so updates pull from the original repo.
  3. `<name>/SKILL.md` — multi-skill repo with skills directly at root level (skips `.`-prefixed dirs, `mcps`, `hooks`, `skills`)
  4. `SKILL.md` at root — single-skill repo
- **Canonical dir**: `.agents/skills/<name>/` — single source of truth for skill files
- **Agent dirs**: `.claude/skills/`, `.cursor/skills/`, `.codex/skills/`, `.opencode/skills/` — symlinked to canonical dir
- **MCP servers**: Defined in `mcps/<name>/mcp.json` directories or root `mcp.json`, merged into agent config files (`.mcp.json` for Claude Code, `.cursor/mcp.json` for Cursor, `.codex/config.toml` for Codex, `opencode.json` for Open Code). Per-agent translation: Claude Code keeps `${VAR}` as is; Cursor gets `${env:VAR}` (a `${VAR:-default}` becomes `${env:VAR}` with a warning, because Cursor has no default-value syntax; Cursor's own variables such as `${workspaceFolder}` are kept); Open Code gets `{env:VAR}` under the `mcp` key; Codex is written as TOML, where only the `[mcp_servers.*]` tables are touched and the rest of `config.toml` is kept, with `Authorization: Bearer ${VAR}` → `bearer_token_env_var`, a header that is exactly `${VAR}` → `env_http_headers`, and an env entry `KEY: ${KEY}` → `env_vars`. A warning is printed when an installed server is also defined in the agent's user-level config.
- **Hooks**: Defined in `hooks/<name>/hooks.json` directories or root `hooks.json`, merged into agent config files (`.claude/settings.json` for Claude Code, `.cursor/hooks.json` for Cursor, `.codex/hooks.json` for Codex; Open Code has no hooks config). Codex uses the `settings` format (same `{ hooks: {...} }` shape as Claude Code, no `version` wrapper). Companion files (scripts, configs) in `hooks/<name>/` are automatically copied to `.agents/hooks/<name>/`
- **Lock (`ai-lock.json`)**: The record of what maconfai wrote in the project, and the only proof of ownership. Each entry holds `source`, `sourceUrl`, `ref`, a path (`skillPath` / `folderPath`: where the config really is in the source repo) and a hash (`skillFolderHash` / `folderHash`: git tree hash, computed from the files for a local source), `agents`, `trusted`, and for a hook the `handlers` written per agent. An MCP entry lists only the agents the server was really written to.
- **Ownership**: What the lock does not record belongs to the user. A same-named skill directory is never overwritten (install and `add` fail with "Refusing to overwrite…", unless `--force`), never pre-checked, never listed by the uninstall, never removed. A same-named MCP server already in an agent config is left as it is.
- **Removal rule**: No flag removes anything. `--skills`, `--mcps` and `--hooks` only add, and print `Kept N installed … not in --<flag>` for what they leave in place; with `-y`, as soon as one list names something, only what is named is installed. A config is removed only by unchecking it in the interactive lists of `install <source>`, by the interactive uninstall (`install` without a source, limited to the current project's lock, refused with `-y`), or by `remove`.
- **add / remove**: `add skill|mcp|hook <source> <name...>` runs `runInstall` in strict mode (`{ strict: true }`): an unknown name, a hand-written conflict or a config written nowhere throws, and `src/cli.ts` prints one `Error:` message and sets exit code 1. Target agents default to those of the lock. `remove skill|mcp|hook <name...>` validates every name against the lock first, takes no option, and cleans only the agents the lock records.
- **Trusted**: Per-config `trusted?: boolean` in `ai-lock.json` (on every skill/MCP/hook entry), set installer-side (never declared by the source). Gates `maconfai update`: trusted configs update blindly; non-trusted configs are **blocked** (reported with the `maconfai trust …` command to run, not changed); `update --include-untrusted` updates all. The gate rule is `trusted !== false` — a **missing** `trusted` (entries installed before the field existed) is grandfathered as trusted. New installs default to non-trusted; `--trusted` or the interactive prompt opts in. `maconfai trust|untrust <name...>|--all` write only that field for configs already installed (`skill:`, `mcp:`, `hook:` prefixes pick a kind when a name is shared). `add{,Mcp,Hook}ToLock` preserve `trusted` when the caller omits it (so update never resets it); `install.ts:resolveTrust` defaults new configs to non-trusted while preserving a reinstalled config's existing trust.
- **check / update**: A GitHub source is compared through the GitHub API (one tree request per repo and ref; `main`, then `master`, then `HEAD`), a local source by the hash of its files. Besides a changed hash, an update is triggered by a missing skill link, MCP config file or hooks config file. Skipped, not failed: a folder gone from the source (`Not found in the source`), a non-GitHub host, a local source absent from this machine. When GitHub refuses the read (token, rate limit, network, private repo), the entry is listed, the others are still updated, and the exit code is 1.
- **status**: Read-only. For each lock entry and agent: `present`, `missing`, `different`, `unknown` or `n/a`. Exit code 0 even when something is missing; 1 only when `ai-lock.json` is unreadable or invalid.
- **Home directory guard**: In `$HOME` the project paths are the user-level agent configs. `install -y` refuses to run there, `check` / `update` refuse without a terminal, and an interactive run asks first (`src/home-dir.ts`).
- **GitHub token**: `GITHUB_TOKEN`, then `GH_TOKEN`, then `gh auth token`. It reaches `git clone` as an HTTP header through `GIT_CONFIG_COUNT` / `GIT_CONFIG_KEY_n` / `GIT_CONFIG_VALUE_n` (git ≥ 2.31), never in the clone URL, and `redactCredentials` masks it in error messages.
- **CLI commands**: `install` (alias `i`), `add` (alias `a`; without `skill|mcp|hook` it is `install`), `remove` (alias `rm`), `check`, `update`, `trust`, `untrust`, `status`, `--help`/`-h`, `--version`/`-v`
- **CLI flags**: `-y`/`--yes` (skip prompts), `--trusted` (mark installed configs trusted), `--force` (replace a same-named skill the lock does not record), `--skills=a,b` (filter skills), `--agents=claude-code,cursor` (filter agents), `--mcps=mcp1,mcp2` (filter MCP servers), `--hooks=hook1,hook2` (filter hooks), `--branch=<name>` (use a branch), `--include-untrusted` (on `check` / `update`: bypass the trust gate), `--all` (on `trust` / `untrust`: every installed config)

## Testing conventions

### Rules

- **1 test per file**, between 30 and 100 lines — small, visual, focused
- Use `describeConfai` from `tests/test-utils.ts` — it wraps `setupScenario()` + `beforeEach(init)` + `afterEach(cleanup)` automatically
- Prefer **inline snapshots** (`toMatchInlineSnapshot`) over manual assertions — the test should read like a visual spec
- Use `targetFiles()` to assert the full file tree, `targetFile(path)` to assert file content
- Tests call the command functions in-process (`runInstall`, `runAdd`, `runRemove`, `runCheck`, `statusText`…) after a `process.chdir` into the target dir; no subprocess
- Each test gets an isolated temp directory (source + target), and each test file an empty temp `HOME` (`tests/setup-fake-home.ts`), so no test reads or writes the real user-level configs
- A test of an interactive flow mocks `@clack/prompts` (`multiselect`, `confirm`) in its own file

### File tree

Tests mirror the feature they cover: `tests/<agent>/<feature>/<case>.test.ts`

```
tests/
  setup-fake-home.ts                                   # Vitest setup file: every test file gets its own empty temp HOME
  test-utils.ts                                        # describeConfai, givenSource, whenInstall, whenAdd, whenRemove, whenUpdate, targetFile, targetFiles
  agents.test.ts                                       # Unit tests for detectProjectAgents
  fake-home.test.ts                                    # Every user-scope skills dir points at the temp HOME, never the real one
  install-choices.test.ts                              # Interactive prompt choices test
  install.test.ts                                      # E2E tests for install/uninstall flow
  installer.test.ts                                    # Unit tests for low-level installer
  mcp.test.ts                                          # Unit tests for MCP module
  sanity.test.ts                                       # Sanity checks
  source-parser.test.ts                                # Unit tests for source parser
  add/
    empty-agents-rejected.test.ts                      # An empty --agents=
    hook-empty-handler-rejected.test.ts                # Add hook: only empty handler lists for the target agents
    hook-only-named.test.ts                            # Add hook: adds only the named hook
    hook-without-handler-rejected.test.ts              # Add hook: no handler for the target agents
    mcp-hand-written-rejected.test.ts                  # Add mcp: a server of the same name written by hand
    mcp-hand-written-writes-nothing.test.ts            # Add mcp: a hand-written server of the same name on one of the agents
    mcp-keeps-installed-mcp.test.ts                    # Add mcp, add hook: another one already installed from the same source
    mcp-only-named.test.ts                             # Add mcp: adds only the named MCP server
    missing-source-rejected.test.ts                    # A local source that does not exist
    no-agents-in-lock-rejected.test.ts                 # No --agents and no agent in the lock
    skill-hand-written-needs-force.test.ts             # Add skill: a hand-written skill of the same name
    skill-keeps-installed-mcp-and-hook.test.ts         # Add skill: an MCP server and a hook already installed from the same source
    skill-keeps-installed.test.ts                      # Add skill: adds only the named skill
    switch-with-value-rejected.test.ts                 # A switch given a value
    unknown-name-rejected.test.ts                      # A name the source does not have
  check/
    check-test-utils.ts                                # Mocks and lock fixtures shared by the check tests
    setup.ts                                           # Vitest setup file of the check project (module mocks, empty cwd)
    all-up-to-date.test.ts                             # No updates available
    blocked-hint-qualifies-and-quotes.test.ts          # Prints a trust command that is safe to paste
    blocked-untrusted-mcp-hook.test.ts                 # Gate also blocks non-trusted MCPs/hooks
    blocked-untrusted.test.ts                          # Non-trusted configs blocked, with the maconfai trust hint
    cancel-update.test.ts                              # User cancels update
    check-failed-mcp-hook-reported.test.ts             # Reports MCP servers and hooks whose hash cannot be read
    check-failed-others-still-updated.test.ts          # Updates reachable entries and fails the run for the unreachable one
    check-skips-non-github-source.test.ts              # Does not check a non-GitHub host against the GitHub API
    decline-update.test.ts                             # User declines update
    fetch-errors.test.ts                               # Unreadable source fails the check; a folder gone from the source is skipped
    grandfathered-trusted.test.ts                      # Missing trusted field = trusted (not blocked)
    hash-triggers-update.test.ts                       # Hash change triggers update
    home-dir-confirmed-in-tty.test.ts                  # Runs when the user confirms in a terminal
    home-dir-declined-in-tty.test.ts                   # Stops when the user declines in a terminal
    home-dir-refused-without-tty.test.ts               # Refuses to run in the home directory without a terminal
    hook-missing-config.test.ts                        # Re-installs a hook whose recorded agent has no hooks config on disk, even at the same hash
    include-untrusted-updates.test.ts                  # --include-untrusted updates non-trusted configs
    mixed-results.test.ts                              # Up-to-date, skipped and errored entries together
    multiple-updates.test.ts                           # Multiple skills need update
    no-skills.test.ts                                  # No skills to check
    skip-no-hash.test.ts                               # Skips entries without hash
    update-subprocess-fail.test.ts                     # Update subprocess fails
    updates-available.test.ts                          # Updates detected
    url-default-branch.test.ts                         # Default branch detection
    url-skill-path.test.ts                             # URL with skill path
    url-strip-git.test.ts                              # Strips .git from URL
    url-strip-trailing-slash.test.ts                   # Strips trailing slash
    url-with-branch.test.ts                            # URL with branch ref
  claude-code/
    hooks/
      install-dir-no-files.test.ts                     # Hook dir without companion files
      install-dir-with-files.test.ts                   # Hook dir with companion scripts
      install-from-dir.test.ts                         # Hook from hooks/<name>/hooks.json
      install-merge.test.ts                            # Sequential installs merge hooks
      install-multiple.test.ts                         # Multiple hook groups
      install-single.test.ts                           # Single hook group
      install-skip-duplicate.test.ts                   # Duplicate handlers not added twice
      install-with-skill.test.ts                       # Hooks alongside a SKILL.md
      update-force-replace.test.ts                     # Force replaces a same-matcher handler (update path)
    mcp/
      install-env.test.ts                              # ${VAR} kept bare (no translation)
      install-from-dir.test.ts                         # MCP from mcps/<name>/mcp.json
      install-headers.test.ts                          # URL + headers, env vars kept bare
      install-merge.test.ts                            # Sequential installs merge MCPs
      install-multiple.test.ts                         # Multiple MCP servers
      install-none.test.ts                             # Empty MCP list installs nothing
      install-preserve-manual.test.ts                  # User-added MCP servers preserved on install
      install-single.test.ts                           # Single MCP server
      install-skip-existing.test.ts                    # Existing MCP name preserved
      install-url.test.ts                              # URL-based MCP (SSE transport)
      install-with-skill.test.ts                       # MCP alongside a skill
      uninstall-single.test.ts                         # Removes one server from .mcp.json, preserves others
      warn-user-scope-duplicate.test.ts                # Warn on an MCP server also defined in ~/.claude.json
      warn-user-scope-skipped-not-warned.test.ts       # No user-scope warning for an MCP server maconfai skips
  codex/
    hooks/
      install-dir-no-files.test.ts                     # Hook dir without companion files
      install-dir-with-files.test.ts                   # Hook dir with companion scripts
      install-from-dir.test.ts                         # Hook from hooks/<name>/hooks.json
      install-merge.test.ts                            # Sequential installs merge hooks
      install-multiple.test.ts                         # Multiple hook groups
      install-single.test.ts                           # Single hook group into .codex/hooks.json
      install-skip-duplicate.test.ts                   # Duplicate handlers not added twice
      install-with-skill.test.ts                       # Hooks alongside a SKILL.md
      install-without-codex-handler.test.ts            # Hook group without a codex handler
    mcp/
      install-env-literal.test.ts                      # Env values Codex cannot forward
      install-env.test.ts                              # KEY: ${KEY} → env_vars in config.toml
      install-from-dir.test.ts                         # MCP from mcps/<name>/mcp.json
      install-headers-literal.test.ts                  # Headers Codex cannot read from env
      install-headers.test.ts                          # Headers → bearer_token_env_var / env_http_headers
      install-merge.test.ts                            # Sequential installs merge in TOML
      install-multiple.test.ts                         # Multiple MCPs in config.toml
      install-none.test.ts                             # Empty MCP list installs nothing
      install-single.test.ts                           # Single MCP in .codex/config.toml
      install-skip-existing.test.ts                    # Existing MCP name preserved
      install-url.test.ts                              # URL-based MCP in config.toml
      preserve-tables-on-install.test.ts               # Install keeps non-MCP tables
      preserve-tables-on-uninstall.test.ts             # Uninstall keeps non-MCP tables
      preserve-trailing-blank-lines.test.ts            # Trailing blank lines
      quotes-in-comments.test.ts                       # Triple quotes outside a string
      reinstall-in-place.test.ts                       # Reinstall replaces an owned server in place
      uninstall-keeps-comment-above.test.ts            # Uninstall keeps comments above the server
      uninstall-single.test.ts                         # Removes one server from TOML, preserves others
      warn-user-scope-duplicate.test.ts                # Warn on an MCP server also defined in ~/.codex/config.toml
    skills/
      install-single.test.ts                           # Single skill to codex agent
  cursor/
    hooks/
      install-dir-no-files.test.ts                     # Hook dir without companion files
      install-dir-with-files.test.ts                   # Hook dir with companion scripts
      install-from-dir.test.ts                         # Hook from hooks/<name>/hooks.json
      install-merge.test.ts                            # Sequential installs merge hooks
      install-multiple.test.ts                         # Multiple hook groups
      install-single.test.ts                           # Single hook group
      install-skip-duplicate.test.ts                   # Duplicate handlers not added twice
      install-with-skill.test.ts                       # Hooks alongside a SKILL.md
    mcp/
      install-builtin-variables.test.ts                # Built-in variables
      install-env-default-secret.test.ts               # Env var default never printed
      install-env-default.test.ts                      # ${VAR:-default} → ${env:VAR}, with a warning (default dropped)
      install-env.test.ts                              # ${VAR} → ${env:VAR} translation
      install-from-dir.test.ts                         # MCP from mcps/<name>/mcp.json
      install-headers.test.ts                          # URL + headers with env translation
      install-merge.test.ts                            # Sequential installs merge MCPs
      install-multiple.test.ts                         # Multiple MCP servers
      install-none.test.ts                             # Empty MCP list installs nothing
      install-preserve-manual.test.ts                  # User-added MCP servers preserved on install
      install-single.test.ts                           # Single MCP server
      install-skip-existing.test.ts                    # Existing MCP name preserved
      install-url.test.ts                              # URL-based MCP (SSE transport)
      install-with-skill.test.ts                       # MCP alongside a skill
      uninstall-single.test.ts                         # Removes one server from .cursor/mcp.json, preserves others
      warn-user-scope-duplicate.test.ts                # Warn on an MCP server also defined in ~/.cursor/mcp.json
  git/
    git-test-utils.ts                                  # Git helpers for tests that need a real repository (runGit, commitAll…)
    clone-error-hides-token.test.ts                    # Never puts the GitHub token in the error of a failed clone
    clone-token-not-in-url.test.ts                     # Passes the token as an HTTP header through the environment, not in the URL
    get-tree-hash.test.ts                              # Resolves a repository-root path from a sub-path working directory
    redact-credentials.test.ts                         # Hides URL credentials and known secrets, and leaves the rest untouched
    redact-ignores-short-secret.test.ts                # Leaves the message readable when the secret is a short placeholder
  install/
    add-agent.test.ts                                  # Add agent to existing install
    agents-ignore-home-after-first-install.test.ts     # Agents of a set-up project ignore $HOME
    combined-skills-mcps-hooks.test.ts                 # All three combined
    cross-agent-uninstall.test.ts                      # Unchecked skill removed from every agent
    discover-root-dirs.test.ts                         # Discovery: <name>/SKILL.md layout
    discover-root-single.test.ts                       # Discovery: root SKILL.md layout
    discover-skills-dir.test.ts                        # Discovery: skills/<name>/SKILL.md layout
    empty-skills-flag-removes-nothing.test.ts          # An empty --skills= removes nothing
    filter-agents.test.ts                              # --agents flag filtering
    filter-hooks.test.ts                               # --hooks flag filtering
    filter-mcps.test.ts                                # --mcps flag filtering
    filter-skills.test.ts                              # --skills flag filtering
    first-install-despite-hand-written-skill.test.ts   # A hand-written skill without lock is still a first install
    first-install-uses-home.test.ts                    # A first install targets the agents found in $HOME
    home-dir-interactive-confirmed.test.ts             # Interactive in the home directory, confirmed
    home-dir-interactive-declined.test.ts              # Interactive in the home directory, declined
    home-dir-refused-with-yes.test.ts                  # -y refused in the home directory
    hooks-flag-keeps-installed.test.ts                 # --hooks adds to the installed hooks
    hooks-only-then-add-skills.test.ts                 # Hooks first, skills later
    interactive-prechecks-project-agents.test.ts       # Interactive pre-checks the agents a project already targets
    lock-hash-for-local.test.ts                        # Lock hash is computed from the files of a local source
    lock-removes-deselected-skill.test.ts              # Lock cleaned when a skill is unchecked
    lock-skill-path-root-dirs.test.ts                  # Lock path of a skill sitting at the repository root
    lock-subpath-skill.test.ts                         # Records a skill installed from its own sub-path at its repository path and hash
    lock-tracks-all-three.test.ts                      # ai-lock.json tracks all
    lock-tracks-hooks.test.ts                          # ai-lock.json tracks hooks
    lock-tracks-mcps.test.ts                           # ai-lock.json tracks MCPs
    lock-tracks-remote-ref.test.ts                     # Remote ref: lock tracks remote source, not proxy repo
    lock-tracks-skills.test.ts                         # ai-lock.json tracks skills
    mcp-not-created-for-codex.test.ts                  # Skill + MCP for Codex written to .codex/config.toml
    mcps-flag-keeps-installed.test.ts                  # --mcps adds to the installed MCP servers
    mcps-hooks-flags-report-kept.test.ts               # --mcps and --hooks say which installed configs they kept
    mcps-only-then-add-skills.test.ts                  # MCPs first, skills later
    multi-agent-hooks.test.ts                          # Hooks to multiple agents
    multi-agent-mcps.test.ts                           # MCPs to multiple agents
    multiple-skills-multiple-agents.test.ts            # Many skills → many agents
    multiple-skills-single-agent.test.ts               # Many skills → one agent
    no-filter-selects-all.test.ts                      # No filter = select everything
    nothing-to-do.test.ts                              # Nothing to install
    reinstall-hooks-preserved.test.ts                  # Hooks preserved on reinstall
    reinstall-idempotent-combined.test.ts              # Full reinstall idempotent
    reinstall-legacy-lock-entry.test.ts                # A lock entry without agents is still a managed skill
    reinstall-managed-skill-updated.test.ts            # A skill already in the lock is updated without --force
    reinstall-mcps-preserved.test.ts                   # MCPs preserved on reinstall
    reinstall-same-skills.test.ts                      # Reinstall idempotent
    remote-ref-basic.test.ts                           # Remote ref: basic install via skills/<name> file
    remote-ref-circular.test.ts                        # Remote ref: circular reference is skipped with warning
    remote-ref-filter.test.ts                          # Remote ref: --skills filter applies to refs
    remote-ref-mixed.test.ts                           # Remote ref: mix of local and remote ref skills
    remote-ref-yaml-include-mcps.test.ts               # Remote ref: YAML include filters to mcps
    remote-ref-yaml-include-prefix.test.ts             # Remote ref: YAML include + prefix combined
    remote-ref-yaml-prefix.test.ts                     # Remote ref: YAML prefix field applied
    remote-ref-yaml-source-only.test.ts                # Remote ref: YAML doc with only a source field
    sequential-different-providers.test.ts             # Two providers sequentially
    sequential-hooks-merge.test.ts                     # Sequential hook installs merge
    single-skill-all-agents.test.ts                    # One skill → all agents
    single-skill-single-agent.test.ts                  # One skill → one agent
    skill-with-hooks.test.ts                           # Skill + hooks bundled
    skill-with-mcp.test.ts                             # Skill + MCP bundled
    skills-flag-keeps-installed.test.ts                # --skills adds to the installed skills
    skills-flag-reports-kept.test.ts                   # --skills says which installed skills it kept
    standalone-hooks.test.ts                           # Hooks-only install (no skills)
    standalone-mcp.test.ts                             # MCP-only install (no skills)
    summary-counts-skills-and-agents.test.ts           # Summary counts skills and agents apart
    summary-failed-skill-copies.test.ts                # Failed summary counts skill copies, not skills
    summary-reinstall-same-hook.test.ts                # Hook summary on a re-install that changes nothing
    summary-skips-existing-identical-hook.test.ts      # Hook summary skips an agent that already had the same hook
    summary-warns-nothing-written.test.ts              # Summary warns instead of "Installed 0"
    switch-agent.test.ts                               # Change agent on reinstall
    trusted-default-untrusted.test.ts                  # New installs default to trusted: false
    trusted-flag.test.ts                               # --trusted writes trusted: true
    trusted-preserved-on-reinstall.test.ts             # -y reinstall keeps existing trust
    uncheck-keeps-hand-written-skill.test.ts           # Unchecking a hand-written skill of the same name
    uninstall-deselected-hooks.test.ts                 # Unchecked hook group removed (interactive)
    uninstall-deselected-mcp.test.ts                   # Unchecked MCP server removed (interactive)
    uninstall-deselected-skill.test.ts                 # Unchecked skill removed (interactive)
    uninstall-never-touches-user-skills.test.ts        # Uninstall: skills only in the user scope are never offered nor removed
    uninstall-project-copy-drops-lock-entry.test.ts    # Uninstall: project copy drops its lock entry
    uninstall-spares-hand-written-mcp.test.ts          # Uninstall: no source spares a same-named MCP server of an agent the lock omits
    uninstall-spares-unlocked-agent-copy.test.ts       # Uninstall: no source spares a same-named copy for an agent the lock omits
    uninstall-spares-unmanaged-skills.test.ts          # Uninstall: no source spares user and hand-written skills
    uninstall-user-copy-keeps-project-lock.test.ts     # Uninstall: a same-named user copy is not offered and the project lock stays
    uninstall-yes-refused.test.ts                      # Uninstall: -y without a source is refused
    unmanaged-skill-force.test.ts                      # --force replaces a hand-written skill of the same name
    unmanaged-skill-inherited-name.test.ts             # A hand-written skill named like an Object property is still unmanaged
    unmanaged-skill-kept-when-deselected.test.ts       # A hand-written skill left out of --skills is not removed
    unmanaged-skill-new-agent-refused.test.ts          # Adding an agent to a managed skill keeps its hand-written copy there
    unmanaged-skill-refused.test.ts                    # A hand-written skill of the same name is refused
    yes-flag-all-agents.test.ts                        # -y flag with all agents
    yes-with-mcps-keeps-installed-skills.test.ts       # -y with --mcps keeps the skills already installed
    yes-with-mcps-skips-hooks.test.ts                  # -y with --mcps installs no unrequested hook or skill
    yes-with-skills-keeps-installed-mcps-hooks.test.ts # -y with --skills keeps the MCP servers and hooks already installed
    yes-with-skills-skips-mcps-hooks.test.ts           # -y with --skills installs no unrequested MCP or hook
    yes-without-filter-selects-all.test.ts             # -y without any filter installs everything
  lock/
    lock-test-utils.ts                                 # Lightweight lock test helpers
    add/
      hook-entry.test.ts                               # Adds new hook entry
      mcp-entry.test.ts                                # Adds new MCP server entry
      multiple-skills.test.ts                          # Multiple skills in lock
      new-entry.test.ts                                # Adds new skill entry
      optional-fields.test.ts                          # Optional fields handled
      persists-to-disk.test.ts                         # Verifies file write
      preserves-installed-at.test.ts                   # Keeps original installedAt
      preserves-trust.test.ts                          # Keeps trusted when update omits it
      preserves-updated-at-when-hash-unchanged.test.ts # Keeps updatedAt when hash unchanged
    fetch-hash/
      auth-header-with-token.test.ts                   # Auth header sent
      auth-header-without-token.test.ts                # No auth when no token
      backslash-normalization.test.ts                  # Normalizes backslashes
      default-branch-fallback.test.ts                  # Reads the default branch through HEAD when neither main nor master exists
      fallback-main-master.test.ts                     # Falls back main → master
      folder-not-found.test.ts                         # Returns null if not found
      forbidden-token-hint.test.ts                     # Says the token cannot read the repository on a plain 403
      matching-folder.test.ts                          # Returns tree hash
      network-error-throws.test.ts                     # Throws when the network is down instead of returning null
      private-repo-without-access-throws.test.ts       # Throws when no branch could be read at all
      rate-limit-throws.test.ts                        # Names the rate limit when GitHub refuses with no requests left
      root-sha-empty-path.test.ts                      # Root SHA for empty path
      specified-ref-only.test.ts                       # Uses specified ref
      strips-skill-md.test.ts                          # Strips SKILL.md from path
      tree-cache-one-request.test.ts                   # Reads one repository tree once for several entries
      tree-not-blob.test.ts                            # Skips blob entries
      unauthorized-throws.test.ts                      # Throws with the HTTP status when GitHub rejects the token
    read/
      corrupted-json.test.ts                           # Handles corrupt JSON
      missing-file.test.ts                             # Returns empty lock if missing
      missing-skills.test.ts                           # Handles missing skills key
      missing-version.test.ts                          # Handles missing version
      valid-file.test.ts                               # Parses valid ai-lock.json
    remove/
      existing-skill.test.ts                           # Removes existing entry
      keeps-others.test.ts                             # Other entries preserved
      non-existent.test.ts                             # No-op for missing entry
      persists-to-disk.test.ts                         # Verifies file write
    token/
      all-fail.test.ts                                 # Returns null if all fail
      empty-cli-output.test.ts                         # Handles empty CLI output
      fallback-cli.test.ts                             # Falls back to gh auth token
      fallback-gh-env.test.ts                          # Falls back to GH_TOKEN
      from-github-env.test.ts                          # GITHUB_TOKEN env var
      prefers-github-over-gh.test.ts                   # GITHUB_TOKEN > GH_TOKEN
      whitespace-cli-output.test.ts                    # Trims CLI output
    write/
      empty-lock.test.ts                               # Writes empty lock
      overwrite.test.ts                                # Overwrites existing lock
      with-skills.test.ts                              # Writes lock with skills
  open-code/
    hooks/
      handlers-not-recorded.test.ts                    # Hook group with an open-code key
    mcp/
      install-env.test.ts                              # ${VAR} → {env:VAR} translation in opencode.json
      install-from-dir.test.ts                         # MCP from mcps/<name>/mcp.json
      install-headers.test.ts                          # URL + headers, env vars kept bare
      install-merge.test.ts                            # Sequential installs merge MCPs
      install-multiple.test.ts                         # Multiple MCPs in opencode.json
      install-none.test.ts                             # Empty MCP list installs nothing
      install-single.test.ts                           # Single MCP with opencode.json format
      install-skip-existing.test.ts                    # Existing MCP name preserved
      install-url.test.ts                              # URL-based MCP (remote type)
      install-with-skill.test.ts                       # MCP alongside a skill
      uninstall-single.test.ts                         # Removes one server from opencode.json, preserves others
      warn-user-scope-duplicate.test.ts                # Warn on an MCP server also defined in ~/.config/opencode/opencode.json
    skills/
      install-single.test.ts                           # Single skill to open-code agent
  remove/
    hook-removed-with-companion.test.ts                # Remove hook: removes only the named hook
    hook-without-handlers-rejected.test.ts             # Remove hook: a lock entry written before handlers were recorded
    mcp-keeps-hand-written-after-install.test.ts       # Remove mcp: an entry written by install next to a hand-written server
    mcp-removed-from-configs.test.ts                   # Remove mcp: removes only the named MCP server
    mcp-without-agents-rejected.test.ts                # Remove mcp: a lock entry that does not record its agents
    skill-keeps-hand-written-copy.test.ts              # Remove skill: a hand-written skill of the same name for another agent
    skill-removed-everywhere.test.ts                   # Remove skill: removes only the named skill
    unknown-name-rejected.test.ts                      # A name that is not in the lock
    unknown-option-rejected.test.ts                    # An option it does not take
  status/
    status-test-utils.ts                               # Hook fixture and status runner shared by the status tests
    all-present.test.ts                                # Every lock entry present on disk
    copy-fallback-present.test.ts                      # Copy fallback instead of a symlink
    invalid-lock.test.ts                               # Invalid ai-lock.json
    legacy-lock-entries.test.ts                        # Legacy lock entries
    mcp-inherited-key.test.ts                          # MCP server named like an Object method
    missing-hook-script.test.ts                        # Deleted hook companion script
    missing-hooks-file.test.ts                         # Deleted hooks config file
    no-lock.test.ts                                    # Project without ai-lock.json
    open-code-mcp-present.test.ts                      # MCP server installed for Open Code
    removed-symlink-missing.test.ts                    # Deleted skill symlink
    skill-directory-different.test.ts                  # Skill replaced by a hand-written directory
    unreadable-config.test.ts                          # Unreadable hooks config
    writes-nothing.test.ts                             # Read-only
  trust/
    trust-test-utils.ts                                # Lock fixtures and runners for trust / untrust
    ambiguous-name-rejected.test.ts                    # Ambiguous name
    kind-prefixed-name.test.ts                         # Kind prefix
    leading-dash-name.test.ts                          # Name starting with a dash
    no-argument-rejected.test.ts                       # No argument
    trust-all.test.ts                                  # --all
    trust-named-entries.test.ts                        # Named entries
    unknown-name-rejected.test.ts                      # Unknown name
    untrust-all.test.ts                                # Untrust: --all
    untrust-named-entries.test.ts                      # Untrust: named entries
    untrust-rejects-bad-names.test.ts                  # Untrust: unknown or ambiguous name
    untrust-then-update-blocked.test.ts                # Untrust: update blocks again
  update/
    legacy-skill-test-utils.ts                         # Fixtures for skills whose lock entry records no agents
    absent-agent-dir-not-recreated.test.ts             # An agent dir absent from the checkout is not recreated
    hook-update-keeps-handlers-in-lock.test.ts         # An updated hook keeps its handlers in the lock
    legacy-skill-detects-codex.test.ts                 # Updates a legacy skill installed for Codex only
    legacy-skill-detects-sanitized-name.test.ts        # Finds a legacy skill under its sanitized directory name
    legacy-skill-no-agent-found.test.ts                # Says why a legacy skill found for no agent cannot be updated
    missing-mcp-config-restored.test.ts                # A tracked MCP config removed from disk is restored
    missing-skill-link-restored.test.ts                # A tracked skill removed from disk is restored
    missing-source-url-uses-source.test.ts             # A lock entry without sourceUrl falls back to source
    skill-name-sanitized-on-disk.test.ts               # A skill installed under its sanitized name is not missing
    local-source/
      absent-source-skipped.test.ts                    # A source not on this machine is skipped
      ds-store-ignored.test.ts                         # A .DS_Store in the source is not a change
      source-change-applied.test.ts                    # A change in the source is applied
      unchanged-source-rewrites-nothing.test.ts        # An unchanged source rewrites nothing
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

- `givenSource({ skills?, skillLayout?, remoteRefs?, mcps?, mcpDirs?, hooks?, hookDirs?, hookDirFiles? })` — creates source fixtures (skills with SKILL.md, `remoteRefs` creates `skills/<name>.yml` ref files, root mcp.json, mcps/<name>/mcp.json dirs, root hooks.json, hooks/<name>/hooks.json dirs, companion files in hook dirs)
- `given(files)` — writes arbitrary files into the source dir
- `givenRemoteSkill(name)` — creates an isolated temp dir containing `skills/<name>/SKILL.md` and returns its path; used as the target for `remoteRefs`
- `givenRemoteRef(name, refContent)` — creates an isolated temp dir containing a `skills/<name>.yml` ref file with that content; used to simulate a circular/chained remote reference
- `givenSkill(...names)` — shorthand for skills without MCP
- `givenSkillWithMcp(name, mcpServers)` — one skill plus `mcps/<name>/mcp.json` dirs
- `whenInstall({ skills?, agents?, mcps?, hooks?, extraArgs? })` — runs `install <source>` with the `-y` flag
- `whenAdd(kind, names, args?)` — runs `add <kind> <source> <names...>`
- `whenRemove(kind, names)` — runs `remove <kind> <names...>`
- `whenUpdate(args?)` — runs `update`
- `whenUninstall()` — runs `install` without a source (the calling file must mock `@clack/prompts`)
- `targetFiles()` — returns sorted list of all files in target dir
- `targetFile(path)` — returns file content as string
- `targetHasFiles(...paths)` / `targetHasNoFiles(...paths)` — asserts that files are (not) in the target dir
- `sourceFiles()` — returns sorted list of all files in source dir
- `getSourceDir()` / `getTargetDir()` — the two temp dirs, to call a command function directly
- `then(fileTree)` — asserts multiple file contents
- `thenExists(path)` — checks file existence
- `thenMcpConfig(path)` — returns a JSON config of the target dir, parsed

## Knowledge base — Agent configuration reference

All agent-specific documentation lives in `docs/agents-config/`. Use these docs as the source of truth when implementing support for each agent.

### Structure

Files follow the pattern `docs/agents-config/[agent-name]/[feature-name].md`. Each file includes a maconfai support status banner.

| Agent           | skills        | hooks         | mcp           | context       | Other           |
| :-------------- | :------------ | :------------ | :------------ | :------------ | :-------------- |
| **Claude Code** | Supported     | Supported     | Supported     | Not supported | `sub-agents.md` |
| **Cursor**      | Supported     | Supported     | Supported     | Not supported | `rules.md`      |
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
