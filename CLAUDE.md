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
- Formatting: prettier

## Commands

- `pnpm test` — Run tests (vitest)
- `npx vitest run` — Run tests once (no watch)
- `pnpm build` — Build with obuild
- `pnpm typecheck` — TypeScript type checking (`tsc --noEmit`)
- `pnpm run dev` — Run CLI in dev mode (`node --experimental-strip-types src/cli.ts`)
- `pnpm prettier` — Check formatting (CI)
- `pnpm prettier:format` — Format all files with Prettier

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
- `tests/test-utils.ts` — Test helpers (`setupScenario`, `skillFile`)
- `tests/install.test.ts` — E2E tests for install/uninstall
- `tests/installer.test.ts` — Unit tests for installer
- `tests/mcp.test.ts` — Unit tests for MCP module
- `tests/sanity.test.ts` — Sanity check tests

## Key concepts

- **Agents**: `claude-code`, `cursor`, `codex`, `gemini-cli`, `amp-code` (type `AgentType`)
- **Skills**: Identified by a `SKILL.md` file inside a `skills/` directory
- **Canonical dir**: `.agents/skills/<name>/` — single source of truth for skill files
- **Agent dirs**: `.claude/skills/`, `.cursor/skills/`, `.codex/skills/`, `.gemini/skills/`, `.amp/skills/` — symlinked to canonical dir
- **MCP servers**: Defined in `mcp.json` alongside `SKILL.md`, merged into agent config files (`.mcp.json` for Claude Code, `.cursor/mcp.json` for Cursor)
- **CLI flags**: `-y`/`--yes` (skip prompts), `--skills=a,b` (filter skills), `--agents=claude-code,cursor` (filter agents), `--mcps=mcp1,mcp2` (filter MCP servers)

## Testing conventions

### Rules

- **1 test per file**, between 30 and 100 lines — small, visual, focused
- Use `describeConfai` from `tests/test-utils.ts` — it wraps `setupScenario()` + `beforeEach(init)` + `afterEach(cleanup)` automatically
- Prefer **inline snapshots** (`toMatchInlineSnapshot`) over manual assertions — the test should read like a visual spec
- Use `thenFiles()` to assert the full file tree, `thenFile(path)` to assert file content
- Tests run the actual CLI via `node --experimental-strip-types` as a subprocess
- Each test gets an isolated temp directory (source + target)

### File tree

Tests mirror the feature they cover: `tests/<agent>/<feature>/<case>.test.ts`

```
tests/
  test-utils.ts                          # describeConfai, givenSource, when, thenFile, thenFiles
  install.test.ts                        # E2E tests for install/uninstall flow
  installer.test.ts                      # Unit tests for low-level installer
  mcp.test.ts                            # Unit tests for MCP module
  source-parser.test.ts                  # Unit tests for source parser
  sanity.test.ts                         # Sanity checks
  claude-code/
    mcp/
      install-single.test.ts             # Single MCP server
      install-multiple.test.ts           # Multiple MCP servers
      install-env.test.ts                # ${VAR} kept bare (no translation)
      install-url.test.ts                # URL-based MCP (SSE transport)
      install-headers.test.ts            # URL + headers, env vars kept bare
      install-with-skill.test.ts         # MCP alongside a SKILL.md
      install-merge.test.ts              # Sequential installs merge MCPs
      install-skip-existing.test.ts      # Existing MCP name preserved
  cursor/
    mcp/
      install-single.test.ts             # Single MCP server
      install-multiple.test.ts           # Multiple MCP servers
      install-env.test.ts                # ${VAR} → ${env:VAR} translation
      install-env-default.test.ts        # ${VAR:-default} → ${env:VAR:-default}
      install-url.test.ts                # URL-based MCP (SSE transport)
      install-headers.test.ts            # URL + headers with env translation
      install-with-skill.test.ts         # MCP alongside a SKILL.md
      install-merge.test.ts              # Sequential installs merge MCPs
      install-skip-existing.test.ts      # Existing MCP name preserved
```

### Test anatomy

```typescript
import { it, expect } from "vitest";
import { describeConfai } from "../../test-utils.ts";

describeConfai("cursor / install single MCP", ({ givenSource, when, thenFile, thenFiles }) => {
  it("should install a simple mcp server", async () => {
    await givenSource({ mcps: { ... } });           // given
    await when({ skills: [...], agents: [...] });    // when
    expect(await thenFiles()).toMatchInlineSnapshot(` // then — file tree
      [...]
    `);
    expect(await thenFile("...")).toMatchInlineSnapshot(` // then — file content
      "..."
    `);
  });
});
```

### Helpers (`describeConfai` provides)

- `givenSource({ skills?, mcps? })` — creates source fixtures (skills with SKILL.md, MCP-only with mcp.json)
- `givenSkill(...names)` — shorthand for skills without MCP
- `when({ skills?, agents?, mcps?, extraArgs? })` — runs the CLI with `-y` flag
- `thenFiles()` — returns sorted list of all files in target dir
- `thenFile(path)` — returns file content as string
- `then(fileTree)` — asserts multiple file contents
- `thenExists(path)` — checks file existence

## Knowledge base — Agent configuration reference

All agent-specific documentation lives in `docs/agents-config/`. Use these docs as the source of truth when implementing support for each agent.

### Structure

Files follow the pattern `docs/agents-config/[agent-name]/[feature-name].md`. Each file includes a maconfai support status banner.

| Agent           | skills        | hooks         | mcp           | context       | Other           |
| :-------------- | :------------ | :------------ | :------------ | :------------ | :-------------- |
| **Claude Code** | Supported     | Not supported | Not supported | Not supported | `sub-agents.md` |
| **Cursor**      | Supported     | Not supported | Not supported | Not supported | `rules.md`      |
| **Codex**       | Supported     | Not supported | Not supported | Not supported | —               |
| **Gemini CLI**  | Not supported | —             | Not supported | Not supported | —               |
| **Amp Code**    | Not supported | —             | Not supported | Not supported | —               |

### Agent skills directory mapping

| Agent       | Project skills dir       | User skills dir                   | Canonical dir            |
| :---------- | :----------------------- | :-------------------------------- | :----------------------- |
| Claude Code | `.claude/skills/<name>/` | `~/.claude/skills/<name>/`        | `.agents/skills/<name>/` |
| Cursor      | `.cursor/skills/<name>/` | `~/.cursor/skills/<name>/`        | `.agents/skills/<name>/` |
| Codex       | `.agents/skills/<name>/` | `~/.codex/skills/<name>/`         | `.agents/skills/<name>/` |
| Gemini CLI  | `.gemini/skills/<name>/` | `~/.gemini/skills/<name>/`        | `.agents/skills/<name>/` |
| Amp Code    | `.agents/skills/<name>/` | `~/.config/agents/skills/<name>/` | `.agents/skills/<name>/` |

### Agent instruction files

| Agent       | Instruction file                     | Config file     | Config format |
| :---------- | :----------------------------------- | :-------------- | :------------ |
| Claude Code | `CLAUDE.md`                          | `settings.json` | JSON          |
| Cursor      | `.cursor/rules/*.mdc` + `AGENTS.md`  | Settings UI     | —             |
| Codex       | `AGENTS.md` (+ `AGENTS.override.md`) | `config.toml`   | TOML          |
| Gemini CLI  | `GEMINI.md` (configurable name)      | `settings.json` | JSON          |
| Amp Code    | `AGENTS.md` (fallback `CLAUDE.md`)   | `settings.json` | JSON          |

### SKILL.md frontmatter (universal)

```yaml
---
name: skill-name # Required — identifier
description: What it does # Required — triggers implicit invocation
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
