> **maconfai support: Not supported** — Context files are not managed by maconfai. Reference only.

# Open Code — Context Files (AGENTS.md)

> Official source: [opencode.ai/docs/rules](https://opencode.ai/docs/rules/)

## What is AGENTS.md in Open Code?

`AGENTS.md` is Open Code's persistent instruction file. It contains project conventions, tech stack, commands, and any information the agent needs. Open Code automatically includes AGENTS.md files from multiple locations.

## Locations and Discovery

| Scope              | Path                                | Loading          |
| :----------------- | :---------------------------------- | :--------------- |
| Project            | `./AGENTS.md`                       | Highest priority |
| Parent directories | Walk up to git worktree             | Merged           |
| Global             | `~/.config/opencode/AGENTS.md`      | Always included  |
| Fallback           | `~/.claude/CLAUDE.md`               | Unless disabled  |

## Fallback File Names

If no `AGENTS.md` exists, Open Code looks for:

1. `CLAUDE.md` (Claude Code compatibility)

## Custom Instruction Files

You can specify custom instruction files in `opencode.json`:

```json
{
  "instructions": {
    "files": ["CUSTOM_RULES.md"]
  }
}
```

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
