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
| User (alt)       | `~/.agents/skills/<name>/SKILL.md`        | Standard      |
| Project (compat) | `.claude/skills/<name>/SKILL.md`          | Claude Code   |
| User (compat)    | `~/.claude/skills/<name>/SKILL.md`        | Claude Code   |
| User (legacy)    | `~/.config/amp/skills/<name>/SKILL.md`    | Amp Code      |

**Priority**: User > Project > Built-in. When the same skill name exists in both a user and a project directory, the user-level skill takes precedence.

## Installation

Use the built-in `building-skills` skill (ask Amp to create or install a skill and specify the scope). The `skill: list` command palette entry lists installed skills.

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

The model decides when to invoke a skill based on the `name` and `description` fields.

## Built-in Skills

The confirmed built-in skill is `building-skills` (helps create new skills). The upstream manual also mentions example bundled skills (Agent Sandbox, BigQuery, Tmux, Web Browser) but does not enumerate a fixed set — treat specific names as subject to change.

## Sources

- [Amp Agent Skills](https://ampcode.com/news/agent-skills)
- [Agent Skills Standard](https://agentskills.io)
