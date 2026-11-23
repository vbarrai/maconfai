> **maconfai support: Not supported** — Amp Code agent is not yet implemented in maconfai. Reference only.

# Amp Code — Skills Guide

> Official source: [ampcode.com/docs/customize/skills](https://ampcode.com/docs/customize/skills) (the former `ampcode.com/manual#agent-skills` now redirects to `ampcode.com/docs`)

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

**Search order** (Amp uses the first skill it finds with a given frontmatter `name`):

1. `~/.config/agents/skills/`
2. `~/.agents/skills/`
3. `~/.config/amp/skills/`
4. `.agents/skills/` in the project and searched parent directories
5. `.claude/skills/` in those directories
6. `~/.claude/skills/`
7. `~/.claude/plugins/cache/`
8. Directories in `amp.skills.path`, in configured order
9. Your personal skills repository
10. Your active workspace skills repository
11. Official Amp skills

Local skills mask repository skills with the same name; personal skills mask workspace skills, and both mask official Amp skills. Local skill directories are searched recursively, up to five levels below each skills root; the directory containing `SKILL.md` is the skill directory. An active directory plugin can register a bundled skill named `<plugin-name>:<skill-name>`.

**Settings**: `amp.skills.path` (extra directories, colon-separated; semicolons on Windows), `amp.skills.disableClaudeCodeSkills` (skips `.claude/skills/`, `~/.claude/skills/` and the plugin cache), `amp.skills.disableGlobalAgentsSkills` (skips `~/.config/agents/skills/` and `~/.agents/skills/`).

## Installation

Use the built-in `building-skills` skill (ask Amp to create or install a skill and specify the scope), or the CLI: `amp skill add <source>` (GitHub repository, Git URL or local path; `--global` installs under `~/.config/agents/skills/`), `amp skill import` / `amp skill update` (shared imports), `amp skills list [--json]`, `amp skills repositories`, `amp clone user-skills` / `amp clone workspace-skills`. The `skills: list` command palette entry (Ctrl+O) lists skills; the `reload_skills` tool rescans local directories (running `amp skills list` in another shell does not reload an existing session).

Personal skills (available everywhere) and workspace skills (managed by admins) each live in their own Git repository, with hosted limits of 200 skills per repository, 200 files per skill, 10 MiB per file, 25 MiB per skill and per repository (hosted skill files must be text; the limits do not apply to local skill directories).

## MCP in Skills

Skills can bundle MCP servers via a sibling `mcp.json` file or the `mcpServers` frontmatter field (if both exist, `mcpServers` wins and `mcp.json` is ignored). Amp connects when it discovers the skill, but hides a skill-only server's tools until the skill loads, reducing context overhead. Local servers start in the thread's working directory, not the skill directory; `AMP_SKILL_DIR` (the skill's absolute path) is set in each local server's environment and `${AMP_SKILL_DIR}` can be used in `command`, `args` or `env`. A same-named server from a CLI flag or direct configuration takes precedence and its tools stay visible.

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

Amp Code does **not** support any frontmatter-based invocation control. The documented frontmatter fields are `name` (must match the directory name in repositories), `description`, and optionally `mcpServers`. There is no equivalent to Claude Code's `disable-model-invocation`, `user-invocable`, or `allowed-tools`.

The model decides when to invoke a skill based on the `name` and `description` fields.

## Built-in Skills

The confirmed built-in skill is `building-skills` (helps create new skills). The upstream manual also mentions example bundled skills (Agent Sandbox, BigQuery, Tmux, Web Browser) but does not enumerate a fixed set — treat specific names as subject to change.

## Sources

- [Skills — Amp Docs](https://ampcode.com/docs/customize/skills)
- [Amp Agent Skills](https://ampcode.com/news/agent-skills)
- [Agent Skills Standard](https://agentskills.io)
