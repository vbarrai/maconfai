> **maconfai support: Not supported** — Context files are not managed by maconfai. Reference only.

# Gemini CLI — Context Files (GEMINI.md)

> Official source: [geminicli.com/docs/cli/gemini-md](https://geminicli.com/docs/cli/gemini-md)

## What is GEMINI.md?

`GEMINI.md` is Gemini CLI's persistent instruction file. It contains project conventions, tech stack, commands, and any information the agent needs. All discovered GEMINI.md files are concatenated and sent to the model with every prompt.

## Locations and Discovery Order

| Scope | Path | Loading |
|:------|:-----|:--------|
| System | `/etc/gemini-cli/GEMINI.md` | At startup (highest priority) |
| User | `~/.gemini/GEMINI.md` | At startup |
| Project/Ancestor | Walked up from the current directory | At startup |
| Subdirectory | Auto-discovered in accessed directories | On demand (just-in-time) |

### On-demand discovery

When a tool accesses a file or directory, the CLI automatically scans for GEMINI.md files in that directory and its ancestors up to a trust root. This allows the model to discover specific instructions only when they are relevant.

## Customizable File Name

The default name is `GEMINI.md`, but it is configurable via `context.fileName` in `settings.json`:

```json
{
  "context": {
    "fileName": ["AGENTS.md", "CONTEXT.md", "GEMINI.md"]
  }
}
```

This means Gemini CLI can read `AGENTS.md` files natively if configured.

## Imports (`@path`)

Modularize your context files with the `@file.md` syntax:

```markdown
See @README.md for the project overview.
Git workflow: @docs/git-workflow.md
Shared guidelines: @../shared/style-guide.md
```

- Relative and absolute paths supported
- `~` expansion supported

## Memory Commands

```bash
/memory show        # View current memory (full concatenated context)
/memory refresh     # Force a re-scan and reload of all GEMINI.md files
/memory add <text>  # Add text to the global GEMINI.md (~/.gemini/GEMINI.md)
```

## Recommended Format

```markdown
# GEMINI.md

## Stack

- TypeScript (ESM)
- React 19
- Tailwind CSS

## Commands

- `npm test` — Run tests
- `npm run build` — Build

## Conventions

- No semicolons
- Single quotes
- Functional components only
```

## Sources

- [GEMINI.md Context Files — Gemini CLI Docs](https://geminicli.com/docs/cli/gemini-md/)
- [GEMINI.md — GitHub Pages](https://google-gemini.github.io/gemini-cli/docs/cli/gemini-md.html)
- [Configuration — Gemini CLI Docs](https://geminicli.com/docs/reference/configuration/)
