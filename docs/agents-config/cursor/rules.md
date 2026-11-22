> **maconfai support: Not supported** — Rules are not managed by maconfai. Reference only.

# Cursor — Rules Guide

> Official source: [cursor.com/docs/rules](https://cursor.com/docs/rules)

## What is a Rule?

Rules are persistent instructions that the Cursor agent sees at the beginning of each conversation. They solve the "memory" problem between completions by anchoring the project's conventions, tech stack, and best practices.

## Types of Rules

### By scope

| Type                  | Storage                                                                                                                           | Applies to                                                                                                                |
| :-------------------- | :-------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------ |
| **Project**           | `.cursor/rules/*.mdc`                                                                                                             | This repo only (versionable). Plain `.md` files in this directory are silently ignored — only `.mdc` files are valid.     |
| **Imported (plugin)** | Plugin imported via Customize > "From GitHub Repository" (the repo needs `.cursor-plugin/marketplace.json`) or a team marketplace | Rules are not imported alone: they come in through a plugin                                                               |
| **User**              | Customize > Rules (Cursor Settings)                                                                                               | All your projects (Agent/Chat mode only — not Inline Edit or Cursor Tab)                                                  |
| **Team**              | Team Dashboard (Team and Enterprise plans)                                                                                        | All team members                                                                                                          |
| **Agent (AGENTS.md)** | `AGENTS.md` at the repo root or in any subdirectory                                                                               | This repo (plain markdown); subdirectory files apply to their children and the more specific instructions take precedence |

**Precedence**: Team Rules → Project Rules → User Rules. Applicable rules are merged, and earlier sources win when guidance conflicts. Project rules may live in subfolders (e.g. `frontend/components.mdc`). Keep rules under 500 lines, split large rules into smaller composable ones, and reference files instead of copying their contents.

**Team Rules options**: "Enable this rule immediately" (unchecked = saved as a draft); "Enforce this rule" (required for all members, cannot be disabled in Customize). Glob patterns are supported; rules without a glob apply to every conversation.

### By activation mode

| Type                                                | Behavior                                                        | Use case                                        |
| :-------------------------------------------------- | :-------------------------------------------------------------- | :---------------------------------------------- |
| **Always Apply** (legacy: Always)                   | Always included in context                                      | Core conventions, tech stack                    |
| **Apply to Specific Files** (legacy: Auto Attached) | Included when files match the `globs` pattern                   | Frontend-specific, backend-specific Rules, etc. |
| **Apply Intelligently** (legacy: Agent Requested)   | The AI decides whether to include it based on the `description` | Specialized knowledge on demand                 |
| **Apply Manually** (legacy: Manual)                 | Included only when mentioned with `@ruleName`                   | Specific workflows invoked manually             |

## `.mdc` format

`.mdc` (Markdown Cursor) files start with a **YAML frontmatter**:

```
---
description: REST API conventions
globs: src/api/**/*.ts
alwaysApply: false
---

# API Conventions

## Endpoints
- Use RESTful conventions
- Return consistent error formats
- Include request validation

## Naming
- Routes in kebab-case
- Controllers in PascalCase
```

### Frontmatter fields

| Field         | Description                                                                                |
| :------------ | :----------------------------------------------------------------------------------------- |
| `description` | Purpose of the rule. Used by the AI to decide whether to include it (Agent Requested mode) |
| `globs`       | Glob pattern(s), comma-separated, for auto-attach. E.g.: `*.tsx`, `src/api/**/*.ts`        |
| `alwaysApply` | `true` = always included (Always mode); `globs` and `description` are then ignored         |

**Type determination**:

- `alwaysApply: true` → **Always**
- `globs` defined (without `alwaysApply`) → **Auto Attached**
- Only `description` → **Agent Requested**
- Neither `globs`, `alwaysApply`, nor `description` → **Manual** (use `@ruleName`)

## AGENTS.md

A simple alternative to `.mdc` files: an `AGENTS.md` file in plain markdown at the repo root. Contains global instructions for the agent.

```markdown
# Agent Instructions

## Tech Stack

- TypeScript (ESM)
- React 19
- Tailwind CSS

## Conventions

- No semicolons
- Single quotes
- Functional components only
```

## Creating Rules

Use the `/create-rule` slash command in Agent chat to create a new rule from the current conversation context: Agent generates the file and saves it to `.cursor/rules`. Customize > Rules > Add Rule also creates a file in `.cursor/rules`.

## Recommended organization

### Small/medium project

```
.cursor/
└── rules/
    ├── project.mdc          # alwaysApply: true — stack, global conventions
    └── best-practices.mdc   # alwaysApply: true — code standards
```

### Large project / Monorepo

```
.cursor/
└── rules/
    ├── core.mdc             # alwaysApply: true — global conventions
    ├── frontend.mdc         # globs: src/frontend/**/*
    ├── backend.mdc          # globs: src/backend/**/*
    ├── api.mdc              # globs: src/api/**/*
    ├── testing.mdc          # globs: **/*.test.*, **/*.spec.*
    └── security.mdc         # description: "Security rules..."
```

### Organization best practices

- **Modular**: one rule per domain to reduce conflicts
- **Precise globs**: target relevant files to avoid noise
- **Clear descriptions**: in Agent Requested mode, the AI must understand when to include the rule
- **No repetition**: reference shared rules rather than duplicating

## Concrete examples

### Always Rule — Tech stack

```
---
alwaysApply: true
---

# Tech Stack

- TypeScript strict
- React 19 with Server Components
- Tailwind CSS v4
- Prisma ORM
- PostgreSQL

## Conventions
- No `any` — use `unknown` if needed
- Functional components only
- Absolute imports via `@/`
```

### Auto Attached Rule — Tests

```
---
description: Testing conventions
globs: "**/*.test.ts,**/*.spec.ts"
---

# Testing Conventions

- Framework: Vitest
- Naming: `describe` → module name, `it` → expected behavior
- No `test.only` in commits
- Mocks: use `vi.mock()` for external dependencies
- Each test must be independent
```

### Agent Requested Rule — Deployment

```
---
description: Deployment process for staging and production.
  Use when discussing deploy, release, or production pushes.
---

# Deployment

## Staging
1. `pnpm build`
2. `pnpm test`
3. `git push origin staging`

## Production
1. Create a PR to `main`
2. Wait for CI to pass
3. Merge and tag the release
```

## Rules vs Skills

| Aspect             | Rules                           | Skills                                              |
| :----------------- | :------------------------------ | :-------------------------------------------------- |
| **Nature**         | Static context                  | Dynamic capabilities                                |
| **Loading**        | Beginning of each conversation  | On demand, when relevant                            |
| **Format**         | `.mdc` (frontmatter + markdown) | `SKILL.md` (frontmatter + markdown + support files) |
| **Content**        | Conventions, standards, stack   | Workflows, scripts, specialized knowledge           |
| **Context impact** | Consumes tokens permanently     | Loaded only when activated                          |
| **Usage**          | Always active or auto-attached  | Invoked by the agent or user                        |

**Simple rule**: use **Rules** for what the agent must **always know**, and **Skills** for what it must **know how to do on demand**.

## Sources

- [Rules — Cursor Docs](https://cursor.com/docs/rules)
- [Rules for AI (legacy) — Cursor Docs](https://docs.cursor.com/context/rules-for-ai)
- [Agent Best Practices — Cursor Blog](https://cursor.com/blog/agent-best-practices)
- [Best Practices for MDC Rules — Cursor Forum](https://forum.cursor.com/t/my-best-practices-for-mdc-rules-and-troubleshooting/50526)
- [awesome-cursor-rules-mdc — GitHub](https://github.com/sanjeed5/awesome-cursor-rules-mdc)
