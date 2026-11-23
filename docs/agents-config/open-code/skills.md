> **maconfai support: Supported** — Skills installation and management for Open Code is fully implemented.

# Open Code — Skills Guide

> Official source: [opencode.ai/docs/skills](https://opencode.ai/docs/skills/) (V2, latest); V1: [opencode.ai/v1/docs/skills](https://opencode.ai/v1/docs/skills/)

> **Versions**: `opencode.ai/docs/` now documents **OpenCode V2 (latest)**; the V1 documentation lives under `opencode.ai/v1/docs/`. The sections below describe the V1 shape that maconfai writes unless a section says V2. V2 reads existing V1 config from the same locations and normalizes it in memory without rewriting the file, so V1-format files keep working (source: [opencode.ai/docs/migrate-v1](https://opencode.ai/docs/migrate-v1/)).

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

Open Code walks up from the current working directory to the git worktree root, loading matching skills found along the way. The V1 page states no explicit precedence order, only that skill names must be unique across all locations (V2 defines one, see below).

## SKILL.md Format

```yaml
---
name: my-skill
description: What the skill does and when to use it.
---
Instructions for the agent...
```

**Frontmatter fields:**

| Field           | Required | Description                                                                                           |
| :-------------- | :------- | :---------------------------------------------------------------------------------------------------- |
| `name`          | Yes      | Skill identifier — regex `^[a-z0-9]+(-[a-z0-9]+)*$`, 1–64 chars, must match the parent directory name |
| `description`   | Yes      | 1-1024 characters, triggers discovery                                                                 |
| `license`       | No       | License identifier                                                                                    |
| `compatibility` | No       | Agent compatibility list                                                                              |
| `metadata`      | No       | Arbitrary string-to-string pairs for skill-specific metadata (e.g., `audience`, `workflow`)           |

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

## V2 (latest) differences

- **Extra sources**: one ordered `skills` array in any `opencode.json(c)` replaces V1's `skills.paths` / `skills.urls`; entries are relative paths (resolved from the active working directory, not the config file), `~/` paths, absolute paths, or `http(s)://` URLs loaded as HTTP catalogs (a base URL with an `index.json` containing a `skills` array of `{ name, version, files }`). Arrays from several config files are combined.
- **Precedence** (lowest to highest; the last source registered for an ID wins): built-in skills, `.claude/skills`, `.agents/skills`, `~/.config/opencode/skills`, project `.opencode/skills`, explicit `skills` entries.
- **Discovery rules**: a markdown file at the source root counts as a skill; files named exactly `SKILL.md` can be nested in grouping directories; a directory containing `SKILL.md` is one skill and is not searched further; hidden files and `node_modules` are skipped; search stops six directories below the source root. `.opencode/skill/` and `.opencode/skills/` are both discovered.
- **Frontmatter**: all optional at runtime. The skill ID comes from the file path (not `name`, which is a display label). `description` is shown to the model (skills without one are not advertised). `metadata.opencode/autoinvoke: false` or `disable-model-invocation: true` removes the skill from the model's list (`opencode/autoinvoke` wins if both are set). `license` and `compatibility` are accepted but not interpreted. V2 does not enforce the name regex, the 1–64 length, the name/directory match, or a maximum description length.
- **Permissions** use a `permissions` array (`permission.skill` is V1): `{ "action": "skill", "resource": "internal-*", "effect": "deny" }` with `allow` / `ask` / `deny`; rules run in order and the last matching rule wins. Per-agent overrides go under `agents.<id>.permissions`.
- **Skill tool**: the model loads a skill by calling `skill` with `{"id": "<skill-id>"}`; users can load one with `@skill-id` in a prompt. On load OpenCode adds the body (without frontmatter), the skill's base directory and a sample of up to ten supporting file paths (directory-based skills only).

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
