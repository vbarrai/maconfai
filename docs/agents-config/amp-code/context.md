> **maconfai support: Not supported** — Context files are not managed by maconfai. Reference only.

# Amp Code — Context Files (AGENTS.md)

> Official source: [ampcode.com/manual](https://ampcode.com/manual)

## What is AGENTS.md in Amp Code?

`AGENTS.md` is Amp Code's persistent instruction file. It contains project conventions, tech stack, commands, and any information the agent needs. Amp automatically includes AGENTS.md files from multiple locations.

## Locations and Discovery

| Scope | Path | Loading |
|:------|:-----|:--------|
| Current directory + ancestors | `AGENTS.md` (up to `$HOME`) | Always included |
| Subtree | `packages/frontend/AGENTS.md` | Included when the agent reads files in that subtree |
| User | `~/.config/amp/AGENTS.md` | Always included |
| User (alt) | `~/.config/AGENTS.md` | Always included |

## Fallback File Names

If no `AGENTS.md` exists, Amp looks for:
1. `AGENT.md` (without the S)
2. `CLAUDE.md`

These legacy filenames continue to work for backward compatibility.

## Scoped Instructions with Globs

AGENTS.md files support a YAML frontmatter with `globs` to target specific file types:

```yaml
---
globs:
  - '**/*.ts'
  - '**/*.tsx'
---

# TypeScript Conventions

- No `any` — use `unknown`
- Absolute imports via `@/`
```

Files with glob specifications are only loaded when Amp has accessed matching files. Without globs, the file loads whenever referenced.

## Cross-References (`@`)

Reference other files within AGENTS.md:

```markdown
See @doc/style.md and @specs/**/*.md
```

Supported formats:
- Relative paths (resolved from the AGENTS.md location)
- Absolute paths and `@~/some/path`
- Glob patterns like `@doc/*.md`

## Migration

```bash
# From Claude Code
mv CLAUDE.md AGENTS.md && ln -s AGENTS.md CLAUDE.md

# From Cursor
mv .cursorrules AGENTS.md && ln -s AGENTS.md .cursorrules
```

## Recommended Format

```markdown
# AGENTS.md

## Stack

- TypeScript (ESM)
- React 19
- Tailwind CSS v4

## Commands

- `npm test` — Run tests
- `npm run build` — Build

## Conventions

- No semicolons
- Single quotes
- Functional components only
```

## Sources

- [Amp Owner's Manual](https://ampcode.com/manual)
- [Sourcegraph Amp](https://sourcegraph.com/amp)
