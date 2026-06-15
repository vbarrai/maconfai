> **maconfai support: Supported** — Skills installation and management for Open Code is fully implemented.

# Open Code — Skills Guide

> Official source: [opencode.ai/docs/skills](https://opencode.ai/docs/skills/)

## Overview

Open Code supports the open Agent Skills standard with progressive disclosure:

| Level          | When Loaded                           | Content                       |
| :------------- | :------------------------------------ | :---------------------------- |
| **Discovery**  | At startup                            | `name` and `description` only |
| **Activation** | When relevant (via native skill tool) | Full SKILL.md body            |
| **Execution**  | On demand                             | Scripts, resources, assets    |

## Locations

| Scope              | Path                                        | Compatibility |
| :----------------- | :------------------------------------------ | :------------ |
| Project            | `.opencode/skills/<name>/SKILL.md`          | Open Code     |
| Project (compat)   | `.claude/skills/<name>/SKILL.md`            | Claude Code   |
| Project (standard) | `.agents/skills/<name>/SKILL.md`            | Standard      |
| User               | `~/.config/opencode/skills/<name>/SKILL.md` | Open Code     |
| User (compat)      | `~/.claude/skills/<name>/SKILL.md`          | Claude Code   |
| User (standard)    | `~/.agents/skills/<name>/SKILL.md`          | Standard      |

Open Code walks up from the current working directory to the git worktree root, loading matching skills found along the way. All three project variants (`.opencode/skills/`, `.claude/skills/`, `.agents/skills/`) and all three user variants are scanned simultaneously — they are not separate tiers with strict precedence.

## SKILL.md Format

```yaml
---
name: my-skill
description: What the skill does and when to use it.
---
Instructions for the agent...
```

**Frontmatter fields:**

| Field           | Required | Description                                                                                              |
| :-------------- | :------- | :------------------------------------------------------------------------------------------------------- |
| `name`          | Yes      | Skill identifier — regex `^[a-z0-9]+(-[a-z0-9]+)*$`, 1–64 chars, must match the parent directory name    |
| `description`   | Yes      | 1-1024 characters, triggers discovery                                                                    |
| `license`       | No       | License identifier                                                                                       |
| `allowed-tools` | No       | Not supported in Open Code (Claude Code-only field); ignored if present |
| `compatibility` | No       | Agent compatibility list                                                                                 |
| `metadata`      | No       | Arbitrary string-to-string pairs for skill-specific metadata (e.g., `audience`, `workflow`)              |

> Unknown frontmatter fields are ignored, so skills can carry agent-specific metadata without breaking discovery.

## Invocation Control

Open Code discovers skills on-demand via the native skill tool — agents see available skills and load full content when needed. The model decides when to invoke a skill based on the `name` and `description` fields.

## Permissions

Skill invocations can be gated in `opencode.json` with glob-style patterns under `permission.skill`:

```json
{
  "permission": {
    "skill": {
      "*": "allow",
      "internal-*": "deny",
      "experimental-*": "ask"
    }
  }
}
```

Values: `allow`, `deny`, `ask`. Patterns are matched against the skill name; later, more specific patterns take precedence over broader ones.

### Agent-Level Overrides

Custom agent frontmatter can set its own `permission.skill` block, and `opencode.json` supports per-agent overrides via `agent.<name>.permission.skill`:

```json
{
  "agent": {
    "build": {
      "permission": {
        "skill": {
          "experimental-*": "deny"
        }
      }
    }
  }
}
```

To disable the skill tool entirely for an agent, set `tools: { skill: false }` in the agent configuration.

## Cross-Platform Compatibility

A skill created for Open Code can work in Claude Code, Cursor, Codex, Gemini CLI, and other platforms thanks to the open Agent Skills standard.

## Sources

- [Open Code Skills](https://opencode.ai/docs/skills/)
- [Agent Skills Standard](https://agentskills.io)
