# Agent Skills — Open Standard

> Source: [agentskills.io](https://agentskills.io) | [GitHub anthropics/skills](https://github.com/anthropics/skills)

## Overview

Agent Skills is an **open format** for giving new capabilities to AI agents. Originally developed by Anthropic (December 2025), it is adopted by **26+ platforms** and the ecosystem counts more than **85,000 indexed skills** (March 2026):

- **Claude Code** (Anthropic)
- **Cursor**
- **VS Code** (GitHub Copilot)
- **OpenAI Codex** and **ChatGPT**
- **Gemini CLI** (Google)
- **Amp Code** (Sourcegraph)
- **Goose** (Block), **Roo Code**, **Trae**, **Windsurf**, **Factory**, and others...

## Core Concept

A Skill is a **directory on the filesystem** containing a `SKILL.md` file with metadata and instructions, plus optionally scripts, references, and assets.

```
skill-name/
├── SKILL.md              # Entry point (required)
├── references/           # Additional documentation
│   └── api-docs.md
├── scripts/              # Executable code
│   └── validate.py
└── assets/               # Resources (templates, data)
    └── template.json
```

## SKILL.md Format

### YAML Frontmatter (metadata)

```yaml
---
name: skill-name
description: What this skill does and when to use it.
---
```

### Required Fields

| Field | Constraints |
|:------|:------------|
| `name` | Max 64 chars. Lowercase, digits, hyphens only. No reserved words (`anthropic`, `claude`). No XML tags. |
| `description` | Non-empty. Max 1024 chars. No XML tags. Must describe what + when. |

### Markdown Body (instructions)

The content after the frontmatter contains the instructions the agent will follow. It can include:

- Text instructions
- Code blocks
- Links to support files
- Examples
- Step-by-step workflows

## Three Loading Levels

| Level | When Loaded | Token Cost | Content |
|:------|:------------|:-----------|:--------|
| **1. Metadata** | At startup | ~100 tokens/Skill | `name` and `description` from frontmatter |
| **2. Instructions** | When the Skill is triggered | < 5,000 tokens recommended | SKILL.md body |
| **3. Resources** | On demand | Effectively unlimited | Referenced files, scripts (executed without loading the code) |

## Progressive Disclosure

The model loads information in stages:

1. **Startup**: only metadata from all Skills is in memory
2. **Triggering**: the full `SKILL.md` is read into context
3. **Specific need**: referenced files are loaded on demand
4. **Execution**: scripts are executed, only the result enters the context

This is what allows installing many Skills without context penalty.

## Support File Contents

### Scripts (`scripts/`)

Executable code the agent can run. Scripts should:
- Be self-contained or clearly document their dependencies
- Handle edge cases gracefully
- Common languages: Python, Bash, JavaScript

### References (`references/`)

Additional documentation loaded on demand. Keep each file focused -- smaller files = less context consumed.

### Assets

Templates, data, configurations.

## Universal Best Practices

### Writing

1. **Concise** -- keep `SKILL.md` under 500 lines
2. **Precise description** -- third person, include what + when
3. **1-level references** -- SKILL.md -> file (not SKILL.md -> A -> B)
4. **Concrete examples** -- show expected inputs/outputs
5. **Table of contents** -- for reference files > 100 lines

### Naming

- Kebab-case: `processing-pdfs`, `testing-code`
- Descriptive: avoid `helper`, `utils`, `tools`
- Consistent across the entire collection

### Structure

- **Simple**: just `SKILL.md` for basic Skills
- **Medium**: `SKILL.md` + a few reference files
- **Complex**: `SKILL.md` + `references/` + `scripts/` + `assets/`

## Implementation by Tool

### Claude Code

| Aspect | Detail |
|:-------|:-------|
| Paths | `~/.claude/skills/`, `.claude/skills/`, plugins |
| Exclusive features | `context: fork`, `agent`, `allowed-tools`, `model`, `hooks`, `disable-model-invocation`, `user-invocable` |
| Substitutions | `$ARGUMENTS`, `$N`, `${CLAUDE_SESSION_ID}`, `${CLAUDE_SKILL_DIR}` |
| Dynamic injection | `` !`command` `` to execute shell before sending |
| Slash commands | `/skill-name` for direct invocation |
| Network | Full access |

### Cursor

| Aspect | Detail |
|:-------|:-------|
| Paths | `.cursor/skills/`, `~/.cursor/skills/` |
| Availability | Stable since v2.4 (January 2026) |
| Complement | Used alongside Rules (`.cursor/rules/*.mdc`) |
| Network | Full access |

### Key Differences

| Feature | Claude Code | Cursor |
|:--------|:------------|:-------|
| Sub-agents (`context: fork`) | Yes | No |
| Shell injection (`` !`cmd` ``) | Yes | No |
| Invocation control (`disable-model-invocation`) | Yes | No |
| Complementary rules | CLAUDE.md | `.cursor/rules/*.mdc` |
| Maturity | Stable | Stable (since v2.4) |

## Security

- Only use Skills from trusted sources (created by you or obtained from Anthropic/official publisher)
- Audit all bundled files before use
- Be cautious with Skills that access external URLs
- Treat installing a Skill like installing software

## Sources

- [Agent Skills — agentskills.io](https://agentskills.io)
- [Agent Skills Specification](https://agentskills.io/specification)
- [Agent Skills Overview — Claude API Docs](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
- [anthropics/skills — GitHub](https://github.com/anthropics/skills)
- [skill.md: An open standard — Mintlify Blog](https://www.mintlify.com/blog/skill-md)
