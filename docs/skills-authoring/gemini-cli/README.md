# Gemini CLI — Configuration Guide

> Official source: [github.com/google-gemini/gemini-cli](https://github.com/google-gemini/gemini-cli) | [geminicli.com/docs](https://geminicli.com/docs)

## Overview

**Gemini CLI** is Google's open source code agent (Apache 2.0), based on Gemini models. It supports `GEMINI.md` context files, the Agent Skills standard, MCP, custom commands, extensions, and sandboxing.

**Free tier**: 60 req/min, 1000 req/day with a personal Google account.

## Installation

```bash
# npm (official package under the @google scope)
npm install -g @google/gemini-cli

# npx (without installation)
npx @google/gemini-cli

# Launch
gemini
```

> **Important**: The npm package is `@google/gemini-cli` (scope `@google`), not `@anthropic-ai/gemini-cli`.

## Instruction Files

### GEMINI.md

Persistent instruction file, equivalent to `CLAUDE.md`:

```markdown
# GEMINI.md

## Stack

- TypeScript
- React 19
- Tailwind CSS

## Commandes

- `npm test` — Tests
- `npm run build` — Build

## Conventions

- Pas de semicolons
- Single quotes
```

### Discovery and Loading

Gemini CLI uses a hierarchical system. It loads context files from multiple locations, concatenates them, and sends them to the model with each prompt.

| Scope | Path | Loading |
|:------|:-----|:--------|
| System | `/etc/gemini-cli/GEMINI.md` | At startup (highest priority) |
| User | `~/.gemini/GEMINI.md` | At startup |
| Project/Ancestor | Walked up from the current directory | At startup |
| Subdirectory (on-demand) | Auto-discovered in accessed directories | On demand |

**On-demand discovery**: when a tool accesses a file or directory, the CLI automatically scans for GEMINI.md files in that directory and its ancestors up to a trust root. This allows the model to discover specific instructions only when they are relevant.

### Customizable File Name

The default name is `GEMINI.md`, but it is configurable via `context.fileName` in `settings.json`:

```json
{
  "context": {
    "fileName": ["CONTEXT.md", "GEMINI.md"]
  }
}
```

### Imports (`@path`)

Modularize your context files with the `@file.md` syntax:

```markdown
Voir @README.md pour l'aperçu du projet.
Instructions git : @docs/git-workflow.md
```

### Memory

```bash
/memory show        # View current memory (full concatenated context)
/memory refresh     # Force a re-scan and reload of all GEMINI.md files
/memory add <text>  # Add text to the global GEMINI.md (~/.gemini/GEMINI.md)
```

## Configuration (`settings.json`)

### Locations

| File | Scope | Priority |
|:-----|:------|:---------|
| `/etc/gemini-cli/settings.json` | System | Highest |
| `~/.gemini/settings.json` | User (global) | Medium |
| `.gemini/settings.json` | Project | Overrides user |

**Precedence**: Hardcoded defaults < System < User < Project. For arrays (`includeDirectories`) and objects (`mcpServers`), values are **merged**.

The project file (`.gemini/settings.json`) can be committed to version control to share configuration with the team.

### Complete Key Reference

#### Authentication

```json
{
  "selectedAuthType": "gemini-api-key"
}
```

#### Model (`model`)

```json
{
  "model": {
    "name": "gemini-2.5-pro-latest",
    "maxSessionTurns": 10,
    "summarizeToolOutput": {
      "run_shell_command": { "tokenBudget": 100 }
    }
  }
}
```

| Key | Type | Description |
|:----|:-----|:------------|
| `name` | string | Model name |
| `maxSessionTurns` | number | Max turns per session |
| `summarizeToolOutput` | object | Tool output summary by name, with token budget |

#### Tools (`tools`)

```json
{
  "tools": {
    "sandbox": "docker",
    "core": ["ReadFileTool", "GlobTool", "ShellTool(ls)"],
    "exclude": ["write_file", "ShellTool(rm -rf)"],
    "discoveryCommand": "bin/get_tools",
    "callCommand": "bin/call_tool"
  }
}
```

| Key | Type | Description |
|:----|:-----|:------------|
| `sandbox` | string/bool | Execution sandbox: `true`, `false`, `"docker"`, `"podman"`, or custom command |
| `core` | string[] | **Allowlist** of available tools (recommended over exclude). Supports per-command restrictions: `"ShellTool(ls -l)"` |
| `exclude` | string[] | **Blocklist** of tools (less secure than `core`) |
| `discoveryCommand` | string | External command to discover tools |
| `callCommand` | string | External command to call tools |

> A tool listed in both `exclude` AND `core` is **excluded**.

#### Context (`context`)

```json
{
  "context": {
    "fileName": ["GEMINI.md", "CONTEXT.md"],
    "includeDirectories": ["path/to/dir1", "~/path/to/dir2"],
    "loadFromIncludeDirectories": true,
    "discoveryMaxDirs": 200,
    "fileFiltering": {
      "respectGitIgnore": true
    }
  }
}
```

| Key | Type | Description |
|:----|:-----|:------------|
| `fileName` | string/string[] | Context file name(s) (default: `"GEMINI.md"`) |
| `includeDirectories` | string[] | Additional directories to scan |
| `loadFromIncludeDirectories` | bool | Load GEMINI.md files from include directories (for `/memory refresh`) |
| `discoveryMaxDirs` | number | Subdirectory scan limit (default: 200) |
| `fileFiltering.respectGitIgnore` | bool | Respect `.gitignore` during search |

#### MCP Servers (`mcpServers`)

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "ghp_..." },
      "cwd": ".",
      "timeout": 30000,
      "trust": false,
      "description": "GitHub MCP server",
      "includeTools": ["get_issue", "list_pull_requests"],
      "excludeTools": ["delete_repository"]
    },
    "remote": {
      "httpUrl": "https://mon-serveur.com/mcp",
      "headers": { "Authorization": "Bearer token" }
    },
    "sse-server": {
      "url": "https://sse-server.com/events"
    }
  }
}
```

| Key | Type | Description |
|:----|:-----|:------------|
| `command` | string | Command to start the stdio server |
| `args` | string[] | Command arguments |
| `env` | object | Process environment variables |
| `cwd` | string | Working directory |
| `url` | string | SSE server URL |
| `httpUrl` | string | Streamable HTTP server URL |
| `headers` | object | HTTP headers for `url`/`httpUrl` |
| `timeout` | number | Timeout in milliseconds |
| `trust` | bool | Trust — bypass tool call confirmations |
| `description` | string | Server description |
| `includeTools` | string[] | Tool allowlist (if specified, only these tools are available) |
| `excludeTools` | string[] | Tool blocklist |

**Transport priority**: `httpUrl` > `url` > `command`.

#### Global MCP (`mcp`)

```json
{
  "mcp": {
    "allowed": ["github", "postgres"],
    "excluded": ["untrusted-server"],
    "serverCommand": "custom-mcp-launcher"
  }
}
```

| Key | Type | Description |
|:----|:-----|:------------|
| `allowed` | string[] | Allowlist of authorized MCP servers |
| `excluded` | string[] | Blocklist of excluded MCP servers |
| `serverCommand` | string | Global command to start an MCP server |

#### UI (`ui`)

```json
{
  "ui": {
    "theme": "Dracula",
    "autoTheme": true,
    "thinking": "full",
    "hideContextSummary": false,
    "useAlternateBuffer": true,
    "incrementalRendering": true,
    "showLineNumbers": false,
    "showCitations": true,
    "useBackgroundColors": true,
    "wittyPhrases": ["Réflexion en cours...", "Analyse du code..."]
  }
}
```

| Key | Type | Description |
|:----|:-----|:------------|
| `theme` | string | Color theme |
| `autoTheme` | bool | Auto-switch between light/dark based on terminal |
| `thinking` | string | Reasoning display: `"off"` or `"full"` |
| `hideContextSummary` | bool | Hide context summary (GEMINI.md, MCP) above the input |
| `useAlternateBuffer` | bool | Use alternate buffer (preserves shell history) |
| `incrementalRendering` | bool | Incremental rendering (reduces flickering, requires `useAlternateBuffer`) |
| `showLineNumbers` | bool | Line numbers in chat |
| `showCitations` | bool | Citations for generated text |
| `useBackgroundColors` | bool | Background colors in the UI |
| `wittyPhrases` | string[] | Custom phrases displayed during loading |

#### File Search

| Key | Description |
|:----|:------------|
| Respect `.geminiignore` | Respect `.geminiignore` files during searches |
| Recursive search | Enable recursive search for `@` references |
| Fuzzy search | Enable fuzzy search for files |
| Additional ignore files | Paths to additional ignore files (takes priority over `.geminiignore` and `.gitignore`) |

#### Telemetry (`telemetry`)

```json
{
  "telemetry": {
    "enabled": true,
    "target": "gcp",
    "otlpEndpoint": "https://otel.example.com",
    "logPrompts": false
  }
}
```

| Key | Type | Description |
|:----|:-----|:------------|
| `enabled` | bool | Enable telemetry |
| `target` | string | Target: `"gcp"` or `"local"` |
| `otlpEndpoint` | string | OpenTelemetry endpoint |
| `logPrompts` | bool | Log prompts |

#### Privacy (`privacy`)

```json
{
  "privacy": {
    "usageStatisticsEnabled": true
  }
}
```

#### Advanced (`advanced`)

```json
{
  "advanced": {
    "excludedEnvVars": ["DEBUG", "NODE_ENV", "SECRET_KEY"],
    "bugCommand": {
      "urlTemplate": "https://jira.example.com/create?summary={{title}}"
    }
  }
}
```

| Key | Type | Description |
|:----|:-----|:------------|
| `excludedEnvVars` | string[] | Environment variables not to pass through |
| `bugCommand.urlTemplate` | string | Redirect `/bug` to an internal ticketing system |

### Environment Variables

| Variable | Description |
|:---------|:------------|
| `GEMINI_API_KEY` | Gemini API key |
| `GEMINI_MODEL` | Default model |
| `GOOGLE_CLOUD_PROJECT` | Google Cloud project |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to the credentials file |

Sensitive variables (TOKEN, SECRET, PASSWORD, KEY, AUTH, CREDENTIAL) are **automatically masked** in logs.

## Skills

Gemini CLI supports the open Agent Skills standard with progressive disclosure:

| Level | When Loaded | Content |
|:------|:------------|:--------|
| **Discovery** | At startup | `name` and `description` only |
| **Activation** | When relevant (via `activate_skill`) | Full SKILL.md body |
| **Execution** | On demand | Scripts, resources, assets |

### Locations

| Scope | Path | Alias |
|:------|:-----|:------|
| Project | `.gemini/skills/<name>/SKILL.md` | `.agents/skills/<name>/SKILL.md` |
| User | `~/.gemini/skills/<name>/SKILL.md` | `~/.agents/skills/<name>/SKILL.md` |

**Priority**: Project > User > Extension. The `.agents/skills/` alias takes priority over `.gemini/skills/` within the same tier.

**Compatibility**: the `.agents/skills/` directory is shared with Claude Code without modification.

### SKILL.md Format

```yaml
---
name: ma-skill
description: Ce que fait la skill et quand l'utiliser.
---

Instructions pour l'agent...
```

> **Important**: Gemini CLI only recognizes `name` and `description` in the frontmatter. No additional fields like `version`, `mode`, or `disable-model-invocation` (those are specific to Claude Code).

### Activation Lifecycle

1. **Discovery**: Only `name` and `description` are loaded at startup
2. **Decision**: Gemini autonomously decides to use a skill based on the prompt and description
3. **Consent**: A confirmation prompt appears (name, purpose, directory path)
4. **Activation**: The model uses the `activate_skill` tool to load the full instructions
5. **Execution**: Scripts and resources are loaded on demand

> **Security**: All skill and extension activations require explicit user consent via the policy engine.

### Built-in Skills

- **skill-creator**: helps create new skills (v0.25.0+, built-in since v0.26.0+)

### No `agents/google.yaml`

Unlike Codex which has an `agents/openai.yaml` file for UI metadata and invocation policy, Gemini CLI **does not have** an equivalent. All skill configuration goes through the `SKILL.md` frontmatter.

## MCP (Model Context Protocol)

### Configuration in `settings.json`

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "ghp_..."
      }
    },
    "remote": {
      "httpUrl": "https://mon-serveur.com/mcp",
      "headers": {
        "Authorization": "Bearer token"
      }
    }
  }
}
```

### Supported Transports

| Type | Field | Usage |
|:-----|:------|:------|
| `stdio` | `command` + `args` + `env` | Local processes |
| `sse` | `url` | Remote servers (SSE) |
| `streamable-http` | `httpUrl` | Remote servers (recommended) |

**Priority** if multiple transports are specified: `httpUrl` > `url` > `command`.

### Trust

stdio servers only connect in **trusted folders**:

```bash
gemini trust    # Mark the current folder as trusted
```

### MCP Tool Naming

Tools are prefixed with the server name: `serverAlias__actualToolName`.

### MCP Resources

Reference resources with `@` in the chat: `@server:protocol://resource/path`.

### OAuth 2.0

Gemini CLI supports OAuth 2.0 authentication for remote MCP servers.

### CLI MCP

```bash
gemini mcp add       # Add a server
gemini mcp list      # List servers
gemini mcp remove    # Remove a server
/mcp                 # Check status (in the CLI)
```

## Custom Commands

### TOML Format

Custom commands are TOML files:

```
~/.gemini/commands/          # Global commands
<project>/.gemini/commands/  # Project commands (priority)
```

```toml
# .gemini/commands/deploy.toml
prompt = "Déploie l'application en production en suivant le workflow CI/CD."
description = "Déploiement en production"
```

### Namespaces

Subdirectories create namespaces with `:` as separator:

```
.gemini/commands/
├── deploy.toml          # /deploy
└── git/
    ├── commit.toml      # /git:commit
    └── release.toml     # /git:release
```

### Argument Substitution

Use `{{args}}` (automatically shell-escaped):

```toml
prompt = "Corrige le ticket GitHub {{args}} en suivant nos standards."
description = "Corriger un ticket"
```

### Reload Commands

```bash
/commands reload
```

## Extensions

Extensions are installable packages that bundle context, MCP servers, custom commands, skills, and policies.

### Installation

```bash
# From a URL
gemini extensions install https://github.com/org/extension

# From a local path
gemini extensions install --path=./mon-extension
```

### Structure

Defined by `gemini-extension.json`:

```json
{
  "name": "mon-extension",
  "version": "1.0.0",
  "mcpServers": {},
  "contextFileName": "EXTENSION_CONTEXT.md",
  "excludeTools": []
}
```

### Locations

Installed in `~/.gemini/extensions/`.

### Extension Security

- Extensions **cannot** bypass security measures
- `allow` and `yolo` are **ignored** in extension policies
- Conflict resolution: workspace > extension

### What an Extension Can Bundle

| Component | Description |
|:----------|:------------|
| Context | Additional GEMINI.md context files |
| MCP Servers | Pre-configured MCP servers |
| Custom commands | TOML command files |
| Skills | Standard Agent Skills |
| Policies | Security and tool rules |

## Sandbox

| Mode | Description |
|:-----|:------------|
| `true` | Sandbox enabled |
| `false` | Sandbox disabled |
| `"docker"` | Isolation via Docker |
| `"podman"` | Isolation via Podman |
| Custom command | Custom sandbox command |

Configuration in `settings.json`:

```json
{
  "tools": {
    "sandbox": "docker"
  }
}
```

## CLI — Commands and Flags

### Flags

| Flag | Description |
|:-----|:------------|
| `gemini` | Interactive mode |
| `gemini -p "prompt"` | Non-interactive mode |
| `gemini -i "prompt"` | Interactive mode with initial prompt |
| `gemini -m <model>` | Model selection |
| `gemini --include-directories ../lib` | Include directories |
| `gemini --output-format json` | JSON output |
| `gemini --output-format stream-json` | Streaming JSON |
| `gemini --sandbox` | Sandbox mode |
| `gemini --yolo` | Auto-approve all tool calls |
| `gemini --resume` | Resume a session |
| `gemini trust` | Mark folder as trusted |

### Built-in Slash Commands

| Command | Description |
|:--------|:------------|
| `/help` | Help |
| `/version` | Version |
| `/auth` | Authentication |
| `/bug` | Report a bug |
| `/chat` | New conversation |
| `/compress` | Compact context |
| `/copy` | Copy last response |
| `/commands` | List/reload commands |
| `/memory show\|refresh\|add` | Manage memory |
| `/mcp` | MCP server status |
| `/settings` | Edit settings interactively |
| `/skills` | List available skills |

## Comparison with Other Tools

| Aspect | Gemini CLI | Claude Code | Codex |
|:-------|:-----------|:------------|:------|
| **npm package** | `@google/gemini-cli` | `@anthropic-ai/claude-code` | `@openai/codex` |
| **Instructions** | `GEMINI.md` (configurable name) | `CLAUDE.md` | `AGENTS.md` |
| **Configuration** | `settings.json` | `settings.json` | `config.toml` |
| **Skills** | `.gemini/skills/`, `.agents/skills/` | `.claude/skills/` | `.agents/skills/` |
| **Skills config** | Frontmatter only | Frontmatter + hooks | `agents/openai.yaml` |
| **MCP transports** | stdio, SSE, streamable HTTP | stdio, streamable HTTP | stdio, streamable HTTP |
| **MCP tool filtering** | `includeTools`/`excludeTools` per server | No | `disabled_tools` per server |
| **Custom commands** | Yes (TOML, namespaces) | Yes (Skills, legacy commands) | No |
| **Extensions** | Yes (`gemini-extension.json`) | Plugins | No |
| **Hooks** | No | Yes (17 events) | Limited (commit attribution) |
| **Sandbox** | Yes (Docker, Podman) | No (permissions) | Yes (built-in, multi-level) |
| **Sub-agents** | No | Yes | Yes (multi-agent) |
| **Imports** | Yes (`@path`) | Yes (`@path`) | No |
| **Models** | Google (Gemini 2.5) | Anthropic (Claude) | OpenAI (GPT-4/5) |
| **License** | Apache 2.0 | Proprietary | MIT |

## Sources

- [Gemini CLI — GitHub](https://github.com/google-gemini/gemini-cli)
- [npm: @google/gemini-cli](https://www.npmjs.com/package/@google/gemini-cli)
- [Configuration Reference](https://geminicli.com/docs/reference/configuration/)
- [Configuration (GitHub)](https://github.com/google-gemini/gemini-cli/blob/main/docs/get-started/configuration.md)
- [GEMINI.md Context Files](https://geminicli.com/docs/cli/gemini-md/)
- [GEMINI.md (GitHub Pages)](https://google-gemini.github.io/gemini-cli/docs/cli/gemini-md.html)
- [Agent Skills](https://geminicli.com/docs/cli/skills/)
- [Creating Agent Skills](https://geminicli.com/docs/cli/creating-skills/)
- [MCP Servers](https://geminicli.com/docs/tools/mcp-server/)
- [MCP Servers (GitHub Pages)](https://google-gemini.github.io/gemini-cli/docs/tools/mcp-server.html)
- [Custom Commands](https://geminicli.com/docs/cli/custom-commands/)
- [Settings Command](https://geminicli.com/docs/cli/settings/)
- [Enterprise Guide](https://google-gemini.github.io/gemini-cli/docs/cli/enterprise.html)
- [Gemini CLI Cheatsheet](https://www.philschmid.de/gemini-cli-cheatsheet)
- [Agent Skills Standard](https://agentskills.io)
