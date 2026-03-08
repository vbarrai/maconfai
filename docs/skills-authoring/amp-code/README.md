# Amp Code — Configuration Guide

> Official source: [ampcode.com/manual](https://ampcode.com/manual) | [sourcegraph.com/amp](https://sourcegraph.com/amp)

## Overview

**Amp Code** (by Sourcegraph) is a code agent that supports the Agent Skills standard, MCP, sub-agents, and Toolboxes. It reads `AGENTS.md` files (with fallback to `CLAUDE.md`) and offers a granular permissions system.

## Instruction Files

### AGENTS.md

Main instruction file. If absent, Amp reads `CLAUDE.md` as a fallback:

```markdown
# AGENTS.md

## Stack

- TypeScript (ESM)
- React 19
- Tailwind CSS v4

## Commandes

- `npm test` — Tests
- `npm run build` — Build

## Conventions

- Pas de semicolons
- Single quotes
```

**Migration from Claude Code**:

```bash
mv CLAUDE.md AGENTS.md && ln -s AGENTS.md CLAUDE.md
```

### Scoped Instructions

AGENTS.md files support a YAML frontmatter with `globs` to target specific files:

```yaml
---
globs: "*.ts"
---

# Conventions TypeScript

- Pas de `any` — utiliser `unknown`
- Imports absolus via `@/`
```

Cross-references are respected: if `AGENTS.md` mentions `See typescript-conventions.md`, the globs from that file are applied.

## Configuration (`settings.json`)

File: `~/.config/amp/settings.json` (macOS).

```json
{
  "amp.mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "ghp_..."
      }
    }
  },
  "amp.commands.allowlist": ["npm test", "npm run build"],
  "amp.tools.disable": []
}
```

## Skills

Amp supports the open Agent Skills standard with progressive disclosure:

| Level | When Loaded | Content |
|:------|:------------|:--------|
| **Discovery** | At startup | `name` and `description` |
| **Activation** | When relevant | Full SKILL.md body |
| **Execution** | On demand | Scripts, resources |

### Locations

| Scope | Path | Compatibility |
|:------|:-----|:-------------|
| Project | `.agents/skills/<name>/SKILL.md` | Standard |
| User | `~/.config/agents/skills/<name>/SKILL.md` | Standard |
| Project (compat) | `.claude/skills/<name>/SKILL.md` | Claude Code |
| User (compat) | `~/.claude/skills/<name>/SKILL.md` | Claude Code |

**Priority**: Project > User > Built-in.

### Installation

Via the command palette: `skill: add` — installs from GitHub, git URL, or local path.

### MCP in Skills

Skills can bundle MCP servers via an `mcp.json` file in the skill directory. Servers start at launch but tools remain hidden until the skill is loaded — reducing context overhead.

```
ma-skill/
├── SKILL.md
├── mcp.json          # Bundled MCP servers (lazy-loaded)
├── scripts/
│   └── validate.sh
└── references/
    └── api-docs.md
```

### Built-in Skill

- **building-skills**: helps create project-specific or user-specific skills

## MCP (Model Context Protocol)

### Configuration

```json
{
  "amp.mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "ghp_..." }
    }
  }
}
```

### MCP Permissions

Granular rule-based permissions system:

```json
{
  "amp.mcpPermissions": [
    { "pattern": "github__*", "action": "allow" },
    { "pattern": "dangerous__delete_*", "action": "block" }
  ]
}
```

**First matching rule wins**; default = allow.

### MCP on the Command Line

`--mcp-config` flag for `-x` commands (without modifying config):

```bash
amp -x --mcp-config ./mcp-servers.json "prompt"
```

## Toolboxes

Custom executable tool system. Set `AMP_TOOLBOX` to a script directory:

```bash
export AMP_TOOLBOX=~/.config/amp/toolbox
```

Each script responds to two actions:

```bash
# Describe the tool
TOOLBOX_ACTION=describe ./mon-outil.sh

# Execute the tool
TOOLBOX_ACTION=execute ./mon-outil.sh
```

## Sub-Agents

Amp supports sub-agents via the **Task** tool, which launches an independent agent with its own context window.

## Oracle

A "second opinion" system using an advanced reasoning model to verify complex decisions.

## Built-in Permissions

| Type | Behavior |
|:-----|:---------|
| **Safe commands** | Auto-approved (`ls`, `git status`, `npm test`, `cargo build`) |
| **Destructive commands** | Require confirmation (`git push`, `rm -rf`) |
| **Allowlist** | Configurable via `amp.commands.allowlist` |

## Comparison with Other Tools

| Aspect | Amp Code | Claude Code | Codex | Gemini CLI |
|:-------|:---------|:------------|:------|:-----------|
| **Instructions** | `AGENTS.md` (fallback `CLAUDE.md`) | `CLAUDE.md` | `AGENTS.md` | `GEMINI.md` |
| **Configuration** | `settings.json` | `settings.json` | `config.toml` | `settings.json` |
| **Skills** | `.agents/skills/` + `.claude/skills/` | `.claude/skills/` | `.agents/skills/` | `.gemini/skills/` |
| **MCP** | Yes (+ bundled in skills) | Yes | Yes | Yes |
| **MCP lazy-load** | Yes (via skills) | Yes (Tool Search) | No | No |
| **Sub-agents** | Yes (Task) | Yes (Explore, Plan, custom) | No | No |
| **Toolboxes** | Yes (executables) | No | No | No |
| **Hooks** | No | Yes (17 events) | No | No |
| **Sandbox** | No (permissions) | No (permissions) | Yes | Yes (Docker) |
| **Oracle** | Yes (GPT-5.4) | No | No | No |
| **Models** | Multi-model | Anthropic (Claude) | OpenAI (GPT-4/5) | Google (Gemini) |

## Sources

- [Amp Owner's Manual](https://ampcode.com/manual)
- [Amp Agent Skills](https://ampcode.com/news/agent-skills)
- [MCP Permissions](https://ampcode.com/news/mcp-permissions)
- [Efficient MCP Tool Loading with Skills](https://ampcode.com/news/lazy-load-mcp-with-skills)
- [Sourcegraph Amp](https://sourcegraph.com/amp)
- [Agent Skills Standard](https://agentskills.io)
