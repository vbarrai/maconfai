> **maconfai support: Not supported** — Amp Code agent is not yet implemented in maconfai. Reference only.

# Amp Code — Skills Guide

> Official source: [ampcode.com/news/agent-skills](https://ampcode.com/news/agent-skills)

## Overview

Amp supports the open Agent Skills standard with progressive disclosure:

| Level | When Loaded | Content |
|:------|:------------|:--------|
| **Discovery** | At startup | `name` and `description` |
| **Activation** | When relevant | Full SKILL.md body |
| **Execution** | On demand | Scripts, resources |

## Locations

| Scope | Path | Compatibility |
|:------|:-----|:-------------|
| Project | `.agents/skills/<name>/SKILL.md` | Standard |
| User | `~/.config/agents/skills/<name>/SKILL.md` | Standard |
| Project (compat) | `.claude/skills/<name>/SKILL.md` | Claude Code |
| User (compat) | `~/.claude/skills/<name>/SKILL.md` | Claude Code |

**Priority**: Project > User > Built-in.

## Installation

Via the command palette: `skill: add` — installs from GitHub, git URL, or local path.

## MCP in Skills

Skills can bundle MCP servers via an `mcp.json` file in the skill directory. Servers start at launch but tools remain hidden until the skill is loaded — reducing context overhead.

```
my-skill/
├── SKILL.md
├── mcp.json          # Bundled MCP servers (lazy-loaded)
├── scripts/
│   └── validate.sh
└── references/
    └── api-docs.md
```

## Built-in Skill

- **building-skills**: helps create project-specific or user-specific skills

## Sources

- [Amp Agent Skills](https://ampcode.com/news/agent-skills)
- [Agent Skills Standard](https://agentskills.io)
