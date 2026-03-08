# CLAUDE.md

## Project

maconfai — Minimal skills manager for Claude Code, Cursor, and Codex.
CLI tool to install, update, and uninstall agent skills from GitHub repos or local directories.

## Stack

- TypeScript (ESM, `"type": "module"`)
- Node.js >= 18
- Package manager: pnpm
- Build: obuild
- Tests: vitest
- CLI prompts: @clack/prompts
- Git operations: simple-git

## Commands

- `pnpm test` — Run tests (vitest)
- `npx vitest run` — Run tests once (no watch)
- `pnpm build` — Build with obuild
- `pnpm run type-check` — TypeScript type checking (`tsc --noEmit`)
- `pnpm run dev` — Run CLI in dev mode (`node --experimental-strip-types src/cli.ts`)

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
- `src/test-utils.ts` — Test helpers (`setupScenario`, `skillFile`)
- `src/install.test.ts` — E2E tests for install/uninstall
- `src/installer.test.ts` — Unit tests for installer
- `src/sanity.test.ts` — Sanity check tests

## Key concepts

- **Agents**: `claude-code`, `cursor`, `codex` (type `AgentType`)
- **Skills**: Identified by a `SKILL.md` file inside a `skills/` directory
- **Canonical dir**: `.agents/skills/<name>/` — single source of truth for skill files
- **Agent dirs**: `.claude/skills/`, `.cursor/skills/`, `.codex/skills/` — symlinked to canonical dir
- **CLI flags**: `-y`/`--yes` (skip prompts), `--skills=a,b` (filter skills), `--agents=claude-code,cursor` (filter agents)

## Testing conventions

- Tests use `setupScenario()` from `test-utils.ts` which provides:
  - `init()` / `cleanup()` — temp directory setup/teardown
  - `givenSkill(...names)` — creates skill fixtures
  - `when({ skills?, agents?, extraArgs? })` — runs the CLI with `-y` flag
  - `then(fileTree)` — asserts file contents
  - `thenExists(path)` — checks file existence
  - `getTargetDir()` — returns the target directory path
- Tests run the actual CLI via `node --experimental-strip-types` as a subprocess
- Each test gets an isolated temp directory (source + target)
- Test describe blocks: `basic installation`, `--skills filter`, `--agents filter`, `-y / --yes flag`, `uninstall skill`, `uninstall agent`

## Code style

- No semicolons (but TypeScript enforces where needed)
- Single quotes
- 2-space indentation
- Functional style, async/await throughout
- Imports use `.ts` extensions
