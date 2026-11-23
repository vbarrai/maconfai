> **maconfai support: Not supported** — Context files are not managed by maconfai. Reference only.

# Amp Code — Context Files (AGENTS.md)

> Official source: [ampcode.com/docs/customize/agents-md](https://ampcode.com/docs/customize/agents-md) (the former `ampcode.com/manual` now redirects to `ampcode.com/docs`; the content lives under the `/docs/...` pages)

## What is AGENTS.md in Amp Code?

`AGENTS.md` is Amp Code's persistent instruction file. It contains project conventions, tech stack, commands, and any information the agent needs. Amp automatically includes AGENTS.md files from multiple locations.

## Locations and Discovery

| Scope                         | Path                                             | Loading                                             |
| :---------------------------- | :----------------------------------------------- | :-------------------------------------------------- |
| Current directory + ancestors | `AGENTS.md` (up to `$HOME`)                      | Always included                                     |
| Subtree                       | `packages/frontend/AGENTS.md`                    | Included when the agent reads files in that subtree |
| User                          | `~/.config/amp/AGENTS.md`                        | Always included                                     |
| User (alt)                    | `~/.config/AGENTS.md`                            | Always included                                     |
| System (macOS)                | `/Library/Application Support/ampcode/AGENTS.md` | Always included                                     |
| System (Linux)                | `/etc/ampcode/AGENTS.md`                         | Always included                                     |
| System (Windows)              | `%ProgramData%\ampcode\AGENTS.md`                | Always included                                     |

> The `amp config agents-md list` CLI command is not mentioned on the current official AGENTS.md page (unverified).

**Global guidance in the web app**: a _Personal Global AGENTS.md_ set in Settings > Instructions also applies to threads running the Claude Code agent. A _Workspace Global AGENTS.md_ (set by admins in Workspace Settings > Instructions) loads before personal and repository guidance and does not apply to subagents, Puck or raw custom agents.

**Ignoring guidance files**: set `AMP_IGNORE_GUIDANCE_FILES` to a colon-delimited list of globs matched against absolute paths (use `/` as the separator and `**` across directories; quote the value). `'*'` ignores all guidance files; ignored files can still be read explicitly with a tool.

## Fallback File Names

If a directory has no `AGENTS.md`, Amp includes one of:

1. `AGENT.md` (without the S)
2. `CLAUDE.md`

These legacy filenames continue to work for backward compatibility.

## Scoped Instructions with Globs

A file referenced by an `@`-mention (and the AGENTS.md files themselves, per the earlier version of this doc) can carry a YAML frontmatter with `globs` to target specific file types; a mentioned file with no `globs` is always included:

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

Files with glob specifications are only loaded after Amp has read a file matching one of the globs. Glob patterns are implicitly prefixed with `**/` unless they start with `../` or `./`, and globs that start with `../` or `./` refer to paths relative to the mentioned file.

## Cross-References (`@`)

Reference other files within AGENTS.md. Note: `@`-mentions inside code blocks are ignored (to avoid false positives).

```markdown
See @doc/style.md and @specs/\*_/_.md
```

Supported formats:

- Relative paths (resolved from the AGENTS.md location)
- `@~/some/path` (home directory); absolute paths are not supported
- Glob patterns like `@doc/*.md` or `@.agent/**/*.md`

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

- [AGENTS.md — Amp Docs](https://ampcode.com/docs/customize/agents-md)
- [Amp Docs](https://ampcode.com/docs)
- [Sourcegraph Amp](https://sourcegraph.com/amp)
