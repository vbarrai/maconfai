# AGENTS.md — Cross-tool Instruction File

## Overview

`AGENTS.md` is an instruction file convention adopted by multiple AI coding agents as a replacement for or complement to tool-specific files like `CLAUDE.md` or `GEMINI.md`. It serves the same purpose — providing persistent project instructions — but with a tool-agnostic name.

The idea is simple: instead of maintaining separate instruction files for each tool (`CLAUDE.md`, `GEMINI.md`, etc.), teams can use a single `AGENTS.md` that works across multiple agents.

## Which tools support AGENTS.md?

| Tool | AGENTS.md support | Behavior |
|:-----|:-------------------|:---------|
| **Codex (OpenAI)** | Primary | Only reads `AGENTS.md` (+ `AGENTS.override.md`) |
| **Amp Code (Sourcegraph)** | Primary | Reads `AGENTS.md`, falls back to `CLAUDE.md` if absent |
| **Cursor** | Supported | Reads `AGENTS.md` at repo root as plain markdown instructions |
| **Claude Code** | Not supported | Uses `CLAUDE.md` only |
| **Gemini CLI** | Not supported | Uses `GEMINI.md` only (configurable name) |

## Format

`AGENTS.md` is plain Markdown — the same format as `CLAUDE.md` or `GEMINI.md`:

```markdown
# AGENTS.md

## Stack

- TypeScript (ESM)
- React 19
- Tailwind CSS v4

## Commands

- `npm test` — Run tests
- `npm run build` — Build
- `npm run lint` — Lint

## Conventions

- No semicolons
- Single quotes
- Functional components only
```

## Tool-specific behaviors

### Codex (OpenAI)

Codex uses `AGENTS.md` as its **only** instruction file. Key behaviors:

**Discovery**: Walks from the Git root to the current working directory, checking each directory for instruction files. One file per directory is loaded.

**Priority**: In each directory, Codex checks `AGENTS.override.md` first, then `AGENTS.md`. The first non-empty file wins.

| File | Priority | Use case |
|:-----|:---------|:---------|
| `AGENTS.override.md` | High | Temporary overrides (release freeze, incident) |
| `AGENTS.md` | Normal | Permanent instructions |

**Loading**: Files are concatenated from root to current directory. Each block appears as a message prefixed by `# AGENTS.md instructions for <directory>`.

**Scopes**:

| Scope | Path |
|:------|:-----|
| User (global) | `~/.codex/AGENTS.md` (or `$CODEX_HOME`) |
| Project | `AGENTS.md` at repo root and subdirectories |

**Size limit**: `project_doc_max_bytes` = 32 KiB by default.

**Alternative filenames**: If your repo uses another name (e.g., `TEAM_GUIDE.md`), add it to `project_doc_fallback_filenames` in `config.toml`.

### Amp Code (Sourcegraph)

Amp reads `AGENTS.md` as its primary instruction file. If absent, it falls back to `CLAUDE.md`.

**Migration from Claude Code**:

```bash
mv CLAUDE.md AGENTS.md && ln -s AGENTS.md CLAUDE.md
```

This keeps both tools working: Amp reads `AGENTS.md`, Claude Code follows the symlink to the same content.

**Scoped instructions**: Amp supports YAML frontmatter with `globs` to target specific files:

```yaml
---
globs: "*.ts"
---

# TypeScript Conventions

- No `any` — use `unknown`
- Absolute imports via `@/`
```

**Cross-references**: If `AGENTS.md` mentions `See typescript-conventions.md`, the globs from that file are also applied.

### Cursor

Cursor reads `AGENTS.md` at the repo root as a simple alternative to `.cursor/rules/*.mdc` files. It functions as plain markdown global instructions for the agent.

Unlike Codex and Amp, Cursor does not support:
- `AGENTS.override.md`
- Hierarchical loading from subdirectories
- YAML frontmatter with globs

For more advanced rule targeting, use `.cursor/rules/*.mdc` files with `globs` and `alwaysApply` frontmatter.

## Multi-tool strategy

### Option 1: AGENTS.md as single source of truth

If your team uses tools that all support `AGENTS.md` (Codex, Amp, Cursor), use it as your only instruction file:

```
project/
└── AGENTS.md          # Works with Codex, Amp, and Cursor
```

### Option 2: AGENTS.md with symlinks

If your team also uses Claude Code or Gemini CLI, use `AGENTS.md` as the source and create symlinks:

```bash
# Write instructions in AGENTS.md
# Create symlinks for tools that need their own file
ln -s AGENTS.md CLAUDE.md
ln -s AGENTS.md GEMINI.md
```

```
project/
├── AGENTS.md          # Source of truth
├── CLAUDE.md → AGENTS.md    # Symlink for Claude Code
└── GEMINI.md → AGENTS.md    # Symlink for Gemini CLI
```

### Option 3: Separate files with shared content

If tools need different instructions (e.g., different allowed commands), maintain separate files but import shared content:

```markdown
# CLAUDE.md

@shared-instructions.md

## Claude-specific settings
- Use vitest for testing
```

```markdown
# AGENTS.md

## Shared instructions
(same content as shared-instructions.md)

## Codex-specific settings
- Sandbox mode: workspace-write
```

> **Note**: The `@path` import syntax is supported by Claude Code and Gemini CLI, but not by Codex or Amp.

## AGENTS.md vs CLAUDE.md vs GEMINI.md

| Aspect | AGENTS.md | CLAUDE.md | GEMINI.md |
|:-------|:----------|:----------|:----------|
| **Philosophy** | Tool-agnostic | Claude Code specific | Gemini CLI specific |
| **Supported by** | Codex, Amp, Cursor | Claude Code, Amp (fallback) | Gemini CLI |
| **Override file** | `AGENTS.override.md` (Codex) | `CLAUDE.local.md` (Claude Code) | — |
| **Hierarchical loading** | Yes (Codex) | Yes (Claude Code, Gemini CLI) | Yes |
| **Scoped with globs** | Yes (Amp only) | Yes (`.claude/rules/`) | — |
| **Imports (`@path`)** | No | Yes | Yes |
| **Configurable name** | No | No | Yes (`context.fileName`) |
| **Max size** | 32 KiB (Codex) | ~200 lines recommended | — |

## Recommendations

1. **New projects** supporting multiple tools: start with `AGENTS.md` + symlinks
2. **Existing Claude Code projects** adopting other tools: create `AGENTS.md` as symlink to `CLAUDE.md`
3. **Keep instructions tool-agnostic**: avoid referencing tool-specific features (hooks, settings paths) in the shared file
4. **Use subdirectory files** for tool-specific overrides when needed

## Sources

- [Custom instructions with AGENTS.md — Codex Docs](https://developers.openai.com/codex/guides/agents-md)
- [Amp Owner's Manual](https://ampcode.com/manual)
- [Cursor Rules — Cursor Docs](https://cursor.com/docs/context/rules)
