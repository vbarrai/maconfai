> **maconfai support: Supported** — Skills installation and management for Cursor is fully implemented.

# Cursor — Agent Skills Guide

> Official source: [cursor.com/docs/context/skills](https://cursor.com/docs/context/skills)

> **Note**: Agent Skills in Cursor have been available since version **v2.4** (January 2026). Initially limited to the Nightly channel, Skills support is now active by default on the stable channel. When you create a "New Cursor Rule" from the interface, Cursor generates a `SKILL.md` in `.cursor/skills/`.

## What is an Agent Skill in Cursor?

Agent Skills extend AI agents with specialized capabilities using the [Agent Skills](https://agentskills.io) open standard. They package knowledge, workflows, and scripts that agents invoke when relevant.

Unlike Rules (always included), Skills are **dynamically loaded** when the agent decides they are relevant -- keeping the context window clean.

## SKILL.md format

The format is the same open standard as for Claude Code:

```yaml
---
name: my-skill
description: What the skill does and when to use it.
---

# Instructions

1. First step
2. Second step
3. Third step
```

### Frontmatter fields

| Field | Description |
|:------|:------------|
| `name` | Skill name (lowercase, digits, hyphens). Max 64 chars. |
| `description` | What the Skill does and when to use it. Required. Max 1024 chars. |

## Where to store Skills

| Scope | Path |
|:-------|:-------|
| Project | `.cursor/skills/<name>/SKILL.md` |
| User | `~/.cursor/skills/<name>/SKILL.md` |

## Skill structure

```
my-skill/
├── SKILL.md           # Main instructions (required)
├── references/
│   └── api-docs.md    # Documentation loaded on demand
├── scripts/
│   └── validate.sh    # Executable scripts
└── assets/
    └── template.json  # Resources
```

## How it works

1. **At startup**: Cursor loads the metadata (`name`, `description`) of all Skills
2. **When relevant**: the agent reads the full `SKILL.md` into context
3. **On demand**: referenced files are loaded if needed
4. **Scripts**: executed via shell, only the result enters the context

## Capabilities

Skills in Cursor can include:

### Custom commands
Reusable workflows invocable with `/`:

```yaml
---
name: deploy
description: Deploy the application to production
---

1. Run the tests
2. Build the application
3. Push to the deployment target
```

### Hooks
Scripts that run before or after agent actions.

### Specialized knowledge
Instructions for domain-specific tasks.

## Full example

```yaml
---
name: create-component
description: Creates a React component with tests and stories.
  Use when asked to create a new UI component.
---

# React Component Creation

## Structure to create

```
src/components/<ComponentName>/
├── <ComponentName>.tsx
├── <ComponentName>.test.tsx
├── <ComponentName>.stories.tsx
└── index.ts
```

## Conventions

- Functional component with TypeScript
- Props typed with interface `<ComponentName>Props`
- Named export + default export in index.ts
- Tests with Testing Library
- Default story + variants

## Component template

```tsx
import { type FC } from 'react'

interface ${name}Props {
  // props
}

export const ${name}: FC<${name}Props> = (props) => {
  return <div>...</div>
}
```
```

## Best practices

### Writing the SKILL.md

1. **Keep under 500 lines** -- move details into separate files
2. **Precise description** -- include "what" and "when"
3. **Third person** -- `"Creates components..."` not `"I create..."`
4. **Concrete examples** -- show the expected result
5. **Single level of reference** -- SKILL.md → file, not SKILL.md → A → B

### Organization

- One Skill per workflow/capability
- Naming in kebab-case
- Separate knowledge (Rules) from actions (Skills)
- Test with real use cases

## Priority: Rules vs Skills

In case of a **contradiction** between a Rule and a Skill, the **Rule wins**. The agent cites the `.mdc` file in its reasoning and ignores the conflicting Skill. This means Rules are the right place for absolute constraints (code conventions, prohibitions), while Skills are suited for flexible workflows.

## Rules vs Skills: when to use what?

| Need | Solution |
|:-------|:---------|
| Always-active code conventions | **Rule** (alwaysApply) |
| Standards specific to certain files | **Rule** (Auto Attached with globs) |
| Complex workflow invoked on demand | **Skill** |
| Specialized knowledge loaded dynamically | **Skill** |
| Reusable utility script | **Skill** (with `scripts/`) |

## Sources

- [Agent Skills — Cursor Docs](https://cursor.com/docs/context/skills)
- [Agent Best Practices — Cursor Blog](https://cursor.com/blog/agent-best-practices)
- [Agent Skills Open Standard](https://agentskills.io)
- [How to use Agent Skills in Cursor? — Cursor Forum](https://forum.cursor.com/t/how-to-use-agent-skills-in-cursor-ide/149860)
