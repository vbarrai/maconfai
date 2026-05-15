> **maconfai support: Not supported** — Context files are not managed by maconfai. Reference only.

# Open Code — Context Files (AGENTS.md)

> Official source: [opencode.ai/docs/rules](https://opencode.ai/docs/rules/)

## What is AGENTS.md in Open Code?

`AGENTS.md` is Open Code's persistent instruction file. It contains project conventions, tech stack, commands, and any information the agent needs. Open Code automatically includes AGENTS.md files from multiple locations.

## Locations and Discovery

| Scope              | Path                           | Loading          |
| :----------------- | :----------------------------- | :--------------- |
| Project            | `./AGENTS.md`                  | Highest priority |
| Parent directories | Walk up to git worktree        | Merged           |
| Global             | `~/.config/opencode/AGENTS.md` | Always included  |

## Fallback File Names

Open Code looks for `AGENTS.md` first; if none is found in a given category, it falls back to `CLAUDE.md`. **First match per category wins** — if both `AGENTS.md` and `CLAUDE.md` exist in the same location, only `AGENTS.md` is loaded. `~/.config/opencode/AGENTS.md` takes precedence over `~/.claude/CLAUDE.md`.

### Search Precedence

The explicit lookup order is:

1. **Local upward walk** — `AGENTS.md` (then `CLAUDE.md`) from the current working directory walking up to the git worktree root.
2. **Global AGENTS.md** — `~/.config/opencode/AGENTS.md`.
3. **Global Claude Code fallback** — `~/.claude/CLAUDE.md`.

## Disabling Claude Code Compatibility

Open Code's Claude Code interop layer can be opted out via environment variables. _Note: these variables were observed in source/changelog but are not in the current upstream config reference; treat as unverified until confirmed against the canonical docs._

| Variable                              | Effect                                                                 |
| :------------------------------------ | :--------------------------------------------------------------------- |
| `OPENCODE_DISABLE_CLAUDE_CODE`        | Disable all Claude Code compatibility behaviors                        |
| `OPENCODE_DISABLE_CLAUDE_CODE_PROMPT` | Skip loading `CLAUDE.md` fallback prompts (`AGENTS.md` only)           |
| `OPENCODE_DISABLE_CLAUDE_CODE_SKILLS` | Skip discovering skills from `.claude/skills/` and `~/.claude/skills/` |

## Custom Instruction Files

Specify custom instruction files in `opencode.json` as an **array of paths or glob patterns**:

```json
{
  "instructions": ["CONTRIBUTING.md", "docs/guidelines.md", ".cursor/rules/*.md"]
}
```

- Glob patterns are supported.
- Remote URLs can also be listed; they are fetched with a 5-second timeout.

## Auto-Generation

Use the `/init` command in Open Code to auto-generate an `AGENTS.md` file for your project.

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
