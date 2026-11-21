> **maconfai support: Not supported** — Context files are not managed by maconfai. Reference only.

# Open Code — Context Files (AGENTS.md)

> Official source: [opencode.ai/docs/rules](https://opencode.ai/docs/rules/) (V2, latest); V1: [opencode.ai/v1/docs/rules](https://opencode.ai/v1/docs/rules/)

> **Versions**: `opencode.ai/docs/` now documents **OpenCode V2 (latest)**; the V1 documentation lives under `opencode.ai/v1/docs/`. The sections below describe the V1 shape that maconfai writes unless a section says V2. V2 reads existing V1 config from the same locations and normalizes it in memory without rewriting the file, so V1-format files keep working (source: [opencode.ai/docs/migrate-v1](https://opencode.ai/docs/migrate-v1/)).

## What is AGENTS.md in Open Code?

`AGENTS.md` is Open Code's persistent instruction file. It contains project conventions, tech stack, commands, and any information the agent needs. Open Code automatically includes AGENTS.md files from multiple locations.

## Locations and Discovery

| Scope              | Path                                                                                                        | Loading                                                       |
| :----------------- | :---------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------ |
| Global             | `~/.config/opencode/AGENTS.md`                                                                              | Loaded first                                                  |
| Project and upward | `AGENTS.md` from the workspace directory up to the home directory (outside home, stops at the project root) | Combined, not overridden; OpenCode does not resolve conflicts |
| Nested (V1)        | `AGENTS.md` in subdirectories                                                                               | Loaded when the agent reads or lists that area, nearest first |

## Fallback File Names

In any directory without an `AGENTS.md`, Open Code reads `CLAUDE.md`; a directory's `AGENTS.md` always wins over its `CLAUDE.md`. If there is no global `~/.config/opencode/AGENTS.md`, it reads `~/.claude/CLAUDE.md`. In V2 the choice is made per directory, so a root `AGENTS.md` no longer hides a nested `CLAUDE.md` (V1 stopped at the first matching file name found up the tree).

### Search Precedence

Combined order (V1 page): global, then nested files from the workspace toward the root, then the project root. Edits to global or upward `AGENTS.md` files are detected before the next model request; edits to nested files are not (start a new session).

## Disabling Claude Code Compatibility

Open Code's Claude Code interop layer can be opted out via environment variables:

| Variable                              | Effect                                                          |
| :------------------------------------ | :-------------------------------------------------------------- |
| `OPENCODE_DISABLE_CLAUDE_CODE`        | Skips every `CLAUDE.md` and also skips `.claude` skills         |
| `OPENCODE_DISABLE_CLAUDE_CODE_PROMPT` | Skips every `CLAUDE.md` (V1 skipped only `~/.claude/CLAUDE.md`) |
| `OPENCODE_DISABLE_PROJECT_CONFIG`     | Skips project `AGENTS.md` discovery but keeps the global file   |

The upstream page does not document `OPENCODE_DISABLE_CLAUDE_CODE_SKILLS`. The server reads these variables at startup; for the background service, persist them with `opencode service set env`, then run `opencode service restart`.

## Custom Instruction Files

Specify custom instruction files in `opencode.json` as an **array of paths or glob patterns**:

```json
{
  "instructions": ["CONTRIBUTING.md", "docs/guidelines.md", ".cursor/rules/*.md"]
}
```

Supported entries: relative paths or globs (searched in each directory from the workspace up to the project root), `~/` paths, absolute paths (the file name may be a glob), and `http://` or `https://` URLs (fetched when config loads, 5-second timeout; a failed fetch is skipped or keeps its last content). `instructions` entries load after the `AGENTS.md` files, in the listed order, and arrays from all config documents are combined. Missing files are skipped; local files update when they change.

## Auto-Generation

The `/init` command is not mentioned on the current official rules page (V1 or V2); it is kept here from the earlier version of this doc and is unverified.

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

- [Open Code Rules](https://opencode.ai/docs/rules/)
- [Open Code Configuration](https://opencode.ai/docs/config/)
