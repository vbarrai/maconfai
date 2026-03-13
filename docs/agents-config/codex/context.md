> **maconfai support: Not supported** — Context files are not managed by maconfai. Reference only.

# OpenAI Codex — Context Files (AGENTS.md)

> Official source: [developers.openai.com/codex/guides/agents-md](https://developers.openai.com/codex/guides/agents-md)

## What is AGENTS.md?

`AGENTS.md` is Codex's persistent instruction file. It contains project conventions, tech stack, useful commands, and any information the agent needs to work effectively. Codex automatically loads it at the start of each session.

## Locations and Discovery Order

### Global scope

Location: `~/.codex/` (or `$CODEX_HOME`).

Codex checks `AGENTS.override.md` first, then `AGENTS.md`. The first non-empty file wins.

### Project scope

Codex walks from the Git root to the current working directory, checking each directory for:

1. `AGENTS.override.md`
2. `AGENTS.md`
3. Fallback filenames (configurable)

At most one file per directory is included.

### Merge behavior

Files are concatenated from root to current directory. Each block appears as a message prefixed with `# AGENTS.md instructions for <directory>`. Closer files complement (do not replace) earlier ones.

## AGENTS.override.md

A temporary override file that replaces `AGENTS.md` at any scope level without deleting the original. Remove the override file to restore shared instructions.

| File | Priority | Usage |
|:-----|:---------|:------|
| `AGENTS.override.md` | High | Temporary override (release freeze, incident) |
| `AGENTS.md` | Normal | Permanent instructions |

## Size Limits

- Default limit: **32 KiB** combined (`project_doc_max_bytes`)
- Codex stops adding files once the combined size reaches the limit
- Empty files are skipped

## Alternative File Names

If your repo uses a different name, configure it in `config.toml`:

```toml
project_doc_fallback_filenames = ["TEAM_GUIDE.md", ".agents.md"]
project_doc_max_bytes = 65536
```

## Custom Home Directory

```bash
CODEX_HOME=$(pwd)/.codex codex exec "command"
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
- `npm run lint` — Linter

## Conventions

- No semicolons
- Single quotes
- Functional components only
```

## Verification

```bash
# Confirm active instructions
codex --ask-for-approval never "Summarize current instructions"

# Test nested overrides
codex --cd subdir --ask-for-approval never "Show active instruction files"
```

## Sources

- [Custom instructions with AGENTS.md — Codex Docs](https://developers.openai.com/codex/guides/agents-md)
- [Configuration Reference — Codex Docs](https://developers.openai.com/codex/config-reference)
