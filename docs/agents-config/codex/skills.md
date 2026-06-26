> **maconfai support: Supported** — Skills installation and management for Codex is fully implemented.

# OpenAI Codex — Skills Guide

> Official source: [developers.openai.com/codex/skills](https://developers.openai.com/codex/skills/)

## Overview

Codex supports the open Agent Skills standard with progressive disclosure:

| Level               | When Loaded                 | Budget                                                     |
| :------------------ | :-------------------------- | :--------------------------------------------------------- |
| **1. Metadata**     | At startup                  | ~8,000 characters total when the context window is unknown |
| **2. Instructions** | When the skill is triggered | SKILL.md body                                              |
| **3. Resources**    | On demand                   | Referenced files, scripts                                  |

## Locations

| Scope  | Path                                                                              |
| :----- | :-------------------------------------------------------------------------------- |
| REPO   | `.agents/skills` (cwd), `../.agents/skills` (parent), `$REPO_ROOT/.agents/skills` |
| USER   | `$HOME/.agents/skills` (note: upstream is NOT `~/.codex/skills`)                  |
| ADMIN  | `/etc/codex/skills`                                                               |
| SYSTEM | Bundled with Codex                                                                |

> **Note:** Upstream documents the USER skills dir as `$HOME/.agents/skills/<name>/`. The maconfai `CLAUDE.md` mapping listing `~/.codex/skills/<name>/` is therefore incorrect and should be updated.

## Skill Structure

```
my-skill/
├── SKILL.md                 # Instructions (required)
├── agents/
│   └── openai.yaml          # UI metadata, invocation policy
├── scripts/
│   └── validate.sh
├── references/
│   └── api-docs.md
└── assets/
    └── template.json
```

The `SKILL.md` format is identical to the open standard:

```yaml
---
name: my-skill
description: What the skill does and when to use it.
---
Instructions for the agent...
```

**Trigger signal**: the `description` field in the YAML is the primary signal. Any "when to use" information belongs in the description, not in the body.

## `agents/openai.yaml` — Codex-Specific Configuration

This optional file configures UI behavior, invocation policy, and dependencies:

```yaml
# UI metadata
interface:
  display_name: 'My Skill'
  short_description: 'Short description for the UI'
  icon_small: 'icons/small.png'
  icon_large: 'icons/large.png'
  brand_color: '#FF6B35'
  default_prompt: 'Use my-skill to...'

# Invocation policy
policy:
  allow_implicit_invocation: true # true (default) — false = explicit invocation only

# Tool dependencies
dependencies:
  tools:
    - type: 'mcp'
      value: 'github'
      description: 'GitHub MCP server for issue/PR management'
      transport: 'streamable_http'
      url: 'https://mcp.example.com/github'
```

| Section                  | Description                                                                           |
| :----------------------- | :------------------------------------------------------------------------------------ |
| **`interface`**          | UI metadata: display name, description, icon, color, default prompt                   |
| **`policy`**             | `allow_implicit_invocation` — if `false`, Codex will not trigger the skill implicitly |
| **`dependencies.tools`** | MCP dependencies auto-installed when the skill is activated                           |

## Skill Invocation

Two invocation modes:

| Mode         | Syntax                                                   | When                                        |
| :----------- | :------------------------------------------------------- | :------------------------------------------ |
| **Explicit** | `$skill-name` (e.g., `$skill-installer`, `$create-plan`) | User triggers directly                      |
| **Implicit** | Automatic                                                | Codex selects the skill based on the prompt |

Commands: `/skills` to list, `$` to mention a skill.

## Disabling a Skill

The upstream-confirmed syntax uses `path` + `enabled`:

```toml
[[skills.config]]
path = "/path/to/skill/SKILL.md"
enabled = false
```

> **Note**: referencing a skill by `name` alone (without `path`) is not documented in the current upstream reference — use `path` to reliably identify the skill.

## Built-in System Skills

Codex ships with skills under the SYSTEM scope (bundled with the binary; exact on-disk location depends on the install):

| Skill                     | Description                                                                                                                                                                |
| :------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `$create-plan`            | Helps plan complex tasks (not confirmed in current upstream skills reference — may be a SYSTEM skill subject to change)                                                    |
| `$skill-creator`          | Helps create new skills                                                                                                                                                    |
| `$skill-installer [name]` | Installs a named or interactively selected skill from a GitHub repository, a local path, or the [curated list](https://github.com/openai/skills/tree/main/skills/.curated) |

## Skills + MCP

Skills and MCP complement each other: skills define repeatable workflows, MCP connects them to external systems (issue trackers, design tools, documentation servers). Declare MCP dependencies in `agents/openai.yaml` for automatic installation.

## Cross-Platform Compatibility

A skill created for Codex can work in Claude Code, Gemini CLI, Cursor, GitHub Copilot, and 30+ other platforms thanks to the open Agent Skills standard.

## Sources

- [Agent Skills](https://developers.openai.com/codex/skills/)
- [Agent Skills Standard](https://agentskills.io)
