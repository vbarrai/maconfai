> **maconfai support: Supported** — Skills installation and management for Open Code is fully implemented.

# Open Code — Skills Guide

> Official source: [opencode.ai/docs/skills](https://opencode.ai/docs/skills/)

## Overview

Open Code supports the open Agent Skills standard with progressive disclosure:

| Level          | When Loaded                          | Content                       |
| :------------- | :----------------------------------- | :---------------------------- |
| **Discovery**  | At startup                           | `name` and `description` only |
| **Activation** | When relevant (via native skill tool) | Full SKILL.md body            |
| **Execution**  | On demand                            | Scripts, resources, assets    |

## Locations

| Scope              | Path                                     | Compatibility |
| :----------------- | :--------------------------------------- | :------------ |
| Project            | `.opencode/skills/<name>/SKILL.md`       | Open Code     |
| Project (compat)   | `.claude/skills/<name>/SKILL.md`         | Claude Code   |
| Project (standard) | `.agents/skills/<name>/SKILL.md`         | Standard      |
| User               | `~/.config/opencode/skills/<name>/SKILL.md` | Open Code  |
| User (compat)      | `~/.claude/skills/<name>/SKILL.md`       | Claude Code   |
| User (standard)    | `~/.agents/skills/<name>/SKILL.md`       | Standard      |

**Priority**: Project > User > Built-in.

Open Code walks up from the current working directory until it reaches the git worktree, loading matching skills along the way.

## SKILL.md Format

```yaml
---
name: my-skill
description: What the skill does and when to use it.
---
Instructions for the agent...
```

**Frontmatter fields:**

| Field              | Required | Description                                |
| :----------------- | :------- | :----------------------------------------- |
| `name`             | Yes      | Skill identifier (must match directory name) |
| `description`      | Yes      | 1-1024 characters, triggers discovery       |
| `license`          | No       | License identifier                          |
| `allowed-tools`    | No       | List of allowed tools                       |
| `compatibility`    | No       | Agent compatibility list                    |
| `metadata`         | No       | Additional metadata (version, internal)     |

## Invocation Control

Open Code discovers skills on-demand via the native skill tool — agents see available skills and load full content when needed. The model decides when to invoke a skill based on the `name` and `description` fields.

## MCP in Skills

Skills can bundle MCP servers via an `mcp.json` file in the skill directory. Servers start at launch but tools remain hidden until the skill is loaded.

```
my-skill/
├── SKILL.md
├── mcp.json          # Bundled MCP servers (lazy-loaded)
├── scripts/
│   └── validate.sh
└── references/
    └── api-docs.md
```

## Cross-Platform Compatibility

A skill created for Open Code can work in Claude Code, Cursor, Codex, Gemini CLI, and other platforms thanks to the open Agent Skills standard.

## Sources

- [Open Code Skills](https://opencode.ai/docs/skills/)
- [Agent Skills Standard](https://agentskills.io)
