> **maconfai support: Not supported** — Context files are not managed by maconfai. Reference only.

# Cursor — Context Files (AGENTS.md)

> Official source: [cursor.com/docs/context/rules](https://cursor.com/docs/context/rules)

## What is AGENTS.md in Cursor?

`AGENTS.md` is a plain markdown alternative to structured `.cursor/rules/*.mdc` files. It provides simple, readable instructions for the agent without requiring frontmatter or metadata configuration.

## Location and Loading

| Scope | Path |
|:------|:-----|
| Project root | `AGENTS.md` |
| Subdirectory | `frontend/AGENTS.md`, `backend/AGENTS.md`, etc. |

Cursor supports nested `AGENTS.md` files in subdirectories, allowing directory-specific instructions. Files placed deeper in the hierarchy take precedence over parent directory versions.

```
project/
  AGENTS.md              # Global instructions
  frontend/AGENTS.md     # Frontend-specific
  backend/AGENTS.md      # Backend-specific
```

## Format

Unlike `.mdc` rule files with frontmatter, `AGENTS.md` is free-form markdown without metadata headers:

```markdown
# AGENTS.md

## Tech Stack

- TypeScript (ESM)
- React 19
- Tailwind CSS

## Conventions

- No semicolons
- Single quotes
- Functional components only
```

## Interaction with Rules

`AGENTS.md` functions as part of the **Project Rules** category, applied alongside `.mdc` files in `.cursor/rules/`.

**Precedence** (highest to lowest):
1. Team Rules
2. Project Rules (`.cursor/rules/*.mdc` + `AGENTS.md`)
3. User Rules

## Scope

Instructions from `AGENTS.md` apply to **Agent (Chat) mode only** — not to Inline Edit or other AI features.

## When to Use AGENTS.md vs Rules

| Need | Solution |
|:-----|:---------|
| Simple, readable project instructions | **AGENTS.md** |
| File-pattern scoped conventions | **Rules** (`.mdc` with `globs`) |
| Always-active constraints | **Rules** (`.mdc` with `alwaysApply`) |
| Agent-decided dynamic loading | **Rules** (`.mdc` with `description`) |

## Sources

- [Rules — Cursor Docs](https://cursor.com/docs/context/rules)
- [Agent Best Practices — Cursor Blog](https://cursor.com/blog/agent-best-practices)
