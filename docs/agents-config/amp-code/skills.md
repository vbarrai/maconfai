> **maconfai support: Not supported** — Amp Code agent is not yet implemented in maconfai. Reference only.

# Amp Code — Skills Guide

> Official source: [ampcode.com/manual#agent-skills](https://ampcode.com/manual#agent-skills)

## Overview

Amp supports the open Agent Skills standard with progressive disclosure:

| Level          | When Loaded   | Content                  |
| :------------- | :------------ | :----------------------- |
| **Discovery**  | At startup    | `name` and `description` |
| **Activation** | When relevant | Full SKILL.md body       |
| **Execution**  | On demand     | Scripts, resources       |

## Locations

| Scope            | Path                                      | Compatibility |
| :--------------- | :---------------------------------------- | :------------ |
| Project          | `.agents/skills/<name>/SKILL.md`          | Standard      |
| User             | `~/.config/agents/skills/<name>/SKILL.md` | Standard      |
| Project (compat) | `.claude/skills/<name>/SKILL.md`          | Claude Code   |
| User (compat)    | `~/.claude/skills/<name>/SKILL.md`        | Claude Code   |

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

## Invocation Control

Amp Code does **not** support any frontmatter-based invocation control. The only recognized frontmatter fields are `name` and `description`. There is no equivalent to Claude Code's `disable-model-invocation`, `user-invocable`, or `allowed-tools`.

The model decides when to invoke a skill based on the `name` and `description` fields. Skill priority is determined by location: project-specific skills override user-wide skills, which override built-in skills.

## Built-in Skills

The upstream manual lists example bundled skills (Agent Sandbox, Agent Skill Creator, BigQuery, Tmux, Web Browser) but does not enumerate a fixed set. Treat any specific built-in name as subject to change.

## Sources

- [Amp Agent Skills](https://ampcode.com/news/agent-skills)
- [Agent Skills Standard](https://agentskills.io)
