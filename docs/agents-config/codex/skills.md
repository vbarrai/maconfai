> **maconfai support: Supported** — Skills installation and management for Codex is fully implemented.

# OpenAI Codex — Skills Guide

> Official source: [developers.openai.com/codex/skills](https://developers.openai.com/codex/skills/)

## Overview

Codex supports the open Agent Skills standard with progressive disclosure:

| Level | When Loaded | Tokens |
|:------|:------------|:-------|
| **1. Metadata** | At startup | ~30-50 tokens/skill |
| **2. Instructions** | When the skill is triggered | SKILL.md body |
| **3. Resources** | On demand | Referenced files, scripts |

## Locations

| Scope | Path |
|:------|:-----|
| Project | `.agents/skills/<name>/SKILL.md` |
| User | `~/.codex/skills/<name>/SKILL.md` |
| System | `~/.codex/skills/.system/` (plan, skill-creator) |

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
  display_name: "My Skill"
  short_description: "Short description for the UI"
  icon: "🔧"
  brand_color: "#FF6B35"
  default_prompt: "Use my-skill to..."

# Invocation policy
policy:
  allow_implicit_invocation: true    # true (default) — false = explicit invocation only

# Tool dependencies (MCP auto-installed)
dependencies:
  tools:
    - name: "github"
      server: "@modelcontextprotocol/server-github"
      env:
        GITHUB_TOKEN: "required"
```

| Section | Description |
|:--------|:------------|
| **`interface`** | UI metadata: display name, description, icon, color, default prompt |
| **`policy`** | `allow_implicit_invocation` — if `false`, Codex will not trigger the skill implicitly |
| **`dependencies.tools`** | MCP dependencies auto-installed when the skill is activated |

## Skill Invocation

Two invocation modes:

| Mode | Syntax | When |
|:-----|:-------|:-----|
| **Explicit** | `$skill-name` (e.g., `$skill-installer`, `$create-plan`) | User triggers directly |
| **Implicit** | Automatic | Codex selects the skill based on the prompt |

Commands: `/skills` to list, `$` to mention a skill.

## Disabling a Skill

```toml
[[skills.config]]
name = "my-skill"
enabled = false
```

## Built-in System Skills

Codex ships with skills in `~/.codex/skills/.system/`:

| Skill | Description |
|:------|:------------|
| `$create-plan` | Helps plan complex tasks |
| `$skill-creator` | Helps create new skills |
| `$skill-installer` | Installs skills from a GitHub repository, a local path, or the [curated list](https://github.com/openai/skills/tree/main/skills/.curated) |

## Skills + MCP

Skills and MCP complement each other: skills define repeatable workflows, MCP connects them to external systems (issue trackers, design tools, documentation servers). Declare MCP dependencies in `agents/openai.yaml` for automatic installation.

## Cross-Platform Compatibility

A skill created for Codex can work in Claude Code, Gemini CLI, Cursor, GitHub Copilot, and 30+ other platforms thanks to the open Agent Skills standard.

## Sources

- [Agent Skills](https://developers.openai.com/codex/skills/)
- [Agent Skills Standard](https://agentskills.io)
