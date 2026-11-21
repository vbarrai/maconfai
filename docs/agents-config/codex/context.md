> **maconfai support: Not supported** — Context files are not managed by maconfai. Reference only.

# OpenAI Codex — Context Files (AGENTS.md)

> Official source: [learn.chatgpt.com/docs/agent-configuration/agents-md](https://learn.chatgpt.com/docs/agent-configuration/agents-md) (moved from `developers.openai.com/codex/guides/agents-md`, which now redirects there)

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

Files are concatenated from root to current directory, joined with blank lines; empty files are skipped. Each block appears as a message prefixed with `# AGENTS.md instructions for <directory>`. Files closer to the current directory come later and override earlier guidance. If no project root is found, only the current directory is checked. The chain is built once per run (once per TUI session): restart Codex to pick up changes.

## AGENTS.override.md

A temporary override file that replaces `AGENTS.md` at any scope level without deleting the original. Remove the override file to restore shared instructions.

| File                 | Priority | Usage                                         |
| :------------------- | :------- | :-------------------------------------------- |
| `AGENTS.override.md` | High     | Temporary override (release freeze, incident) |
| `AGENTS.md`          | Normal   | Permanent instructions                        |

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
CODEX_HOME=$(pwd)/.codex codex exec "List active instruction sources"
```

`CODEX_HOME` changes the global home directory and its `AGENTS.md` / `AGENTS.override.md`; check it with `echo $CODEX_HOME` when instructions seem to come from the wrong place.

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

# Confirm the workspace root
codex status

# Write a plaintext TUI log (./.codex-log/codex-tui.log)
codex -c log_dir=./.codex-log
```

Troubleshooting: nothing loads (check the repo and `codex status`; files must not be empty); wrong guidance (look for an `AGENTS.override.md` higher in the tree or under the Codex home); fallback names ignored (check spelling in `project_doc_fallback_filenames`, then restart); truncated instructions (raise `project_doc_max_bytes` or split files across nested directories).

## Sources

- [Custom instructions with AGENTS.md — Codex Docs](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [Configuration Reference — Codex Docs](https://developers.openai.com/codex/config-reference)
