# CLAUDE.md

## Project

maconfai — Universal configuration installer for AI coding agents (Claude Code, Cursor, Codex, Gemini CLI, Amp Code).
CLI tool to install, update, and uninstall any type of agent configuration from GitHub repos or local directories, using a single source of truth.

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

- **Agents**: `claude-code`, `cursor`, `codex`, `gemini-cli`, `amp-code` (type `AgentType`)
- **Skills**: Identified by a `SKILL.md` file inside a `skills/` directory
- **Canonical dir**: `.agents/skills/<name>/` — single source of truth for skill files
- **Agent dirs**: `.claude/skills/`, `.cursor/skills/`, `.codex/skills/`, `.gemini/skills/`, `.amp/skills/` — symlinked to canonical dir
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

## Knowledge base — Agent configuration reference

All agent-specific documentation lives in `docs/skills-authoring/`. Use these docs as the source of truth when implementing support for each agent.

### Index

- `docs/skills-authoring/README.md` — Overview, comparison tables, feature matrix across all agents
- `docs/skills-authoring/standard/agent-skills-spec.md` — Agent Skills open standard (SKILL.md format, progressive disclosure)
- `docs/skills-authoring/standard/agents-md.md` — AGENTS.md cross-tool instruction file (replaces/complements CLAUDE.md)

### Per-agent guides

| Agent | Guide | Key topics |
|:------|:------|:-----------|
| **Claude Code** | `docs/skills-authoring/claude-code/` | CLAUDE.md, skills, hooks (17 events), MCP (.mcp.json), sub-agents, settings.json |
| **Cursor** | `docs/skills-authoring/cursor/` | Rules (.mdc), skills, hooks (.cursor/hooks.json), MCP, AGENTS.md support |
| **Codex (OpenAI)** | `docs/skills-authoring/codex/README.md` | AGENTS.md, config.toml (full ref), agents/openai.yaml, sandbox (3 modes), multi-agent, [features] flags, MCP, profiles |
| **Gemini CLI (Google)** | `docs/skills-authoring/gemini-cli/README.md` | GEMINI.md, settings.json (full ref), skills, MCP (stdio/SSE/HTTP), custom commands (TOML), extensions, sandbox (Docker/Podman) |
| **Amp Code (Sourcegraph)** | `docs/skills-authoring/amp-code/README.md` | AGENTS.md, skills, MCP, toolboxes, sub-agents (Task), oracle |

### Agent skills directory mapping

| Agent | Project skills dir | User skills dir | Canonical dir |
|:------|:-------------------|:----------------|:--------------|
| Claude Code | `.claude/skills/<name>/` | `~/.claude/skills/<name>/` | `.agents/skills/<name>/` |
| Cursor | `.cursor/skills/<name>/` | `~/.cursor/skills/<name>/` | `.agents/skills/<name>/` |
| Codex | `.agents/skills/<name>/` | `~/.codex/skills/<name>/` | `.agents/skills/<name>/` |
| Gemini CLI | `.gemini/skills/<name>/` | `~/.gemini/skills/<name>/` | `.agents/skills/<name>/` |
| Amp Code | `.agents/skills/<name>/` | `~/.config/agents/skills/<name>/` | `.agents/skills/<name>/` |

### Agent instruction files

| Agent | Instruction file | Config file | Config format |
|:------|:----------------|:------------|:-------------|
| Claude Code | `CLAUDE.md` | `settings.json` | JSON |
| Cursor | `.cursor/rules/*.mdc` + `AGENTS.md` | Settings UI | — |
| Codex | `AGENTS.md` (+ `AGENTS.override.md`) | `config.toml` | TOML |
| Gemini CLI | `GEMINI.md` (configurable name) | `settings.json` | JSON |
| Amp Code | `AGENTS.md` (fallback `CLAUDE.md`) | `settings.json` | JSON |

### SKILL.md frontmatter (universal)

```yaml
---
name: skill-name          # Required — identifier
description: What it does  # Required — triggers implicit invocation
---
```

Agent-specific extras:
- **Codex**: `agents/openai.yaml` (interface, policy.allow_implicit_invocation, dependencies.tools)
- **Claude Code**: frontmatter supports `version`, `mode`, `disable-model-invocation`, `allowed-tools`
- **Gemini CLI**: only `name` + `description` recognized (no agents/google.yaml)

## Code style

- No semicolons (but TypeScript enforces where needed)
- Single quotes
- 2-space indentation
- Functional style, async/await throughout
- Imports use `.ts` extensions
