# OpenAI Codex — Configuration Guide

> Official source: [developers.openai.com/codex](https://developers.openai.com/codex) | [github.com/openai/codex](https://github.com/openai/codex)

## Overview

**Codex** is OpenAI's code agent, available as a CLI, IDE (VS Code, Cursor, Windsurf), desktop and web application. It supports the open Agent Skills standard, MCP, and provides a sandboxed environment for code execution.

## Installation

```bash
# npm
npm install -g @openai/codex

# Homebrew (macOS)
brew install --cask codex

# Launch
codex
```

## Instruction Files

### AGENTS.md

Main instruction file, equivalent to Claude Code's `CLAUDE.md`:

```markdown
# AGENTS.md

## Stack

- TypeScript (ESM)
- React 19
- Tailwind CSS v4

## Commandes

- `npm test` — Tests
- `npm run build` — Build
- `npm run lint` — Linter

## Conventions

- Pas de semicolons
- Single quotes
- Composants fonctionnels uniquement
```

### Discovery and Loading

**Global scope** (`~/.codex/` or `$CODEX_HOME`): checks `AGENTS.override.md` first, then `AGENTS.md`. The first non-empty file wins.

**Project scope**: walks up from the Git root to the current directory, checking `AGENTS.override.md` then `AGENTS.md` in each directory (one file max per directory).

| File | Priority | Usage |
|:-----|:---------|:------|
| `AGENTS.override.md` | High | Temporary override (release freeze, incident) |
| `AGENTS.md` | Normal | Permanent instructions |

**Behavior**: files are concatenated from root to current directory. Each block appears as a message prefixed with `# AGENTS.md instructions for <directory>`.

**Size limit**: `project_doc_max_bytes` = 32 KiB by default.

### Alternative File Names

If your repo uses a different name (e.g., `TEAM_GUIDE.md`), add it to `project_doc_fallback_filenames` in `config.toml`.

## Configuration (`config.toml`)

Main configuration file in TOML format:

| Location | Scope |
|:---------|:------|
| `~/.codex/config.toml` | User (global) |
| `.codex/config.toml` | Project (trusted repos only) |

**Priority**: Project (root -> CWD) > user > system defaults.

### Main Options (root keys)

```toml
# Model
model = "gpt-5-codex"
model_provider = "openai"              # "openai" (default), "azure", "ollama"
model_reasoning_effort = "medium"      # "low", "medium", "high"
model_context_window = 128000          # Context window size
model_max_output_tokens = 4096         # Max output tokens

# Approval policy
approval_policy = "on-request"  # "untrusted", "on-request" (default), "never"
# Or granular:
# approval_policy = { reject = { sandbox = true, mcp_elicitations = true } }

# Sandbox
sandbox_mode = "read-only"  # "read-only" (default), "workspace-write", "danger-full-access"

# Web search
web_search = "cached"  # "cached" (default), "live", "disabled"

# Automatic context compaction
compaction_threshold = 80000  # Token threshold

# Log directory
log_directory = "$CODEX_HOME/log"

# Reasoning
hide_agent_reasoning = false
show_raw_agent_reasoning = false

# Storage
disable_response_storage = false

# File opening
file_opener = "vscode"  # Editor for opening files

# Additional instructions (alternative to AGENTS.md)
developer_instructions = "Toujours écrire les tests avant le code."
model_instructions_file = "path/to/custom-instructions.md"

# MCP OAuth
mcp_oauth_callback_port = 8080       # Fixed port for OAuth callback (optional)
mcp_oauth_callback_url = "..."       # Redirect URI override (optional)

# Citations
citation_uri_scheme = "vscode"        # URI scheme for citations

# Review model
review_model = "gpt-4o"              # Model used by /review

# Model catalog
model_catalog_json = "path/to/catalog.json"
```

### Advanced Sandbox (`[sandbox_workspace_write]`)

```toml
[sandbox_workspace_write]
writable_roots = ["./src", "./tests"]        # Writable directories
network_access = false                        # Network blocked by default
exclude_tmpdir_env_var = false               # Exclude $TMPDIR from sandbox
exclude_slash_tmp = false                     # Exclude /tmp from sandbox
```

Native enforcement by platform:
- **macOS**: Seatbelt
- **Linux**: Landlock (+ optional bubblewrap via `features.use_linux_sandbox_bwrap`)
- **Windows**: `sandbox = "elevated"` or `"unelevated"` in `[windows]`

### Environment Variables (`[shell_environment_policy]`)

Controls variables passed to subprocesses:

```toml
[shell_environment_policy]
inherit = "core"             # "none" (clean slate) or "core" (minimal set)
exclude = ["SECRET_KEY", "AWS_*"]
include_only = ["PATH", "HOME", "LANG"]
ignore_default_excludes = false

[shell_environment_policy.set]
NODE_ENV = "development"
```

### Model Providers (`[model_providers]`)

```toml
[model_providers.azure]
name = "Azure OpenAI"
base_url = "https://my-resource.openai.azure.com/openai"
env_key = "AZURE_OPENAI_API_KEY"
wire_api = "responses"                     # "responses" or "chat"
requires_openai_auth = false
request_max_retries = 3
stream_max_retries = 3
stream_idle_timeout_ms = 30000
query_params = { "api-version" = "2025-03-01-preview" }

[model_providers.ollama]
name = "Ollama Local"
base_url = "http://localhost:11434/v1"
wire_api = "chat"
```

### Named Profiles (`[profiles]`)

```toml
[profiles.fast]
model = "gpt-4o"
approval_policy = "on-request"

[profiles.deep]
model = "o3"
model_reasoning_effort = "high"
approval_policy = "never"

# Launch with: codex --profile deep
```

### Feature Flags (`[features]`)

```toml
[features]
# Stable
shell_tool = true                          # Shell tool
unified_exec = true                        # PTY-backed exec (default except Windows)
sqlite = true                              # SQLite persistence (default: on)
undo = false                               # Undo support (default: off)
feedback = true                            # /feedback (default: on)

# Multi-agent
multi_agent = true                         # Multi-agent workflows
child_agents_md = true                     # Child AGENTS.md

# Skills
skill_mcp_dependency_install = true        # Auto-install MCP dependencies for skills
skill_env_var_dependency_prompt = true      # Prompt for required env vars

# Sandbox
use_linux_sandbox_bwrap = false            # Bubblewrap (experimental)

# Shell
shell_snapshot = true                      # Shell snapshots

# Apps
apps = false                               # Application support
apps_mcp_gateway = false                   # MCP gateway for apps

# Miscellaneous
personality = false                        # Configurable personality
fast_mode = false                          # Fast mode
image_generation = false                   # Image generation
runtime_metrics = false                    # Runtime metrics
powershell_utf8 = false                    # UTF-8 for PowerShell
enable_request_compression = false         # Request compression
```

### Notifications (`[notify]`)

Trigger an external program on events:

```toml
[notify]
command = "notify-send"
args = ["Codex", "Agent terminé"]
# Supported event: agent-turn-complete
```

### Windows (`[windows]`)

```toml
[windows]
sandbox = "elevated"  # "elevated" (recommended) or "unelevated" (fallback)
```

### TUI

```toml
[tui]
theme = "dark"  # Saved by /theme
```

## MCP (Model Context Protocol)

### Configuration in `config.toml`

```toml
[mcp_servers.github]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-github"]
env = { GITHUB_TOKEN = "ghp_..." }
cwd = "."                        # Working directory (optional)
startup_timeout_sec = 10
tool_timeout_sec = 60
enabled = true

[mcp_servers.remote-api]
url = "https://mon-serveur.com/mcp"            # SSE
# or
http_url = "https://mon-serveur.com/mcp"       # Streamable HTTP (recommended)
bearer_token_env_var = "MY_API_TOKEN"
http_headers = { "X-Custom" = "value" }
env_http_headers = { "Authorization" = "MY_AUTH_VAR" }

[mcp_servers.disabled-example]
command = "..."
enabled = false                                 # Disabled without removing
disabled_tools = ["dangerous_tool"]             # Specific tools disabled
```

### Supported Transports

| Type | Fields | Usage |
|:-----|:-------|:------|
| `stdio` | `command` + `args` + `env` | Local processes |
| `streamable-http` | `http_url` or `url` | Remote servers |

### Per-Server Options

| Option | Type | Description |
|:-------|:-----|:------------|
| `command` | string | stdio command |
| `args` | string[] | Command arguments |
| `env` | table | Environment variables |
| `cwd` | string | Working directory |
| `url` | string | SSE URL |
| `http_url` | string | Streamable HTTP URL |
| `bearer_token_env_var` | string | Env variable for Bearer token |
| `http_headers` | table | Static HTTP headers |
| `env_http_headers` | table | HTTP headers from env variables |
| `startup_timeout_sec` | number | Startup timeout (default: 10s) |
| `tool_timeout_sec` | number | Per-tool timeout (default: 60s) |
| `enabled` | bool | Enable/disable the server |
| `disabled_tools` | string[] | List of tools to disable |

### CLI MCP

```bash
codex mcp              # List servers
codex mcp add          # Add a server
codex mcp remove       # Remove a server
codex mcp authenticate # Authenticate (OAuth)
```

### Codex as an MCP Server

```bash
codex mcp-serve
```

Exposes `codex()` and `codex-reply()` tools to other MCP clients.

## Skills

Codex supports the open Agent Skills standard with progressive disclosure:

| Level | When Loaded | Tokens |
|:------|:------------|:-------|
| **1. Metadata** | At startup | ~30-50 tokens/skill |
| **2. Instructions** | When the skill is triggered | SKILL.md body |
| **3. Resources** | On demand | Referenced files, scripts |

### Locations

| Scope | Path |
|:------|:-----|
| Project | `.agents/skills/<name>/SKILL.md` |
| User | `~/.codex/skills/<name>/SKILL.md` |
| System | `~/.codex/skills/.system/` (plan, skill-creator) |

### Skill Structure

```
ma-skill/
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
name: ma-skill
description: Ce que fait la skill et quand l'utiliser.
---

Instructions pour l'agent...
```

**Trigger signal**: the `description` field in the YAML is the primary signal. Any "when to use" information belongs in the description, not in the body.

### `agents/openai.yaml` — Codex-Specific Configuration

This optional file configures UI behavior, invocation policy, and dependencies:

```yaml
# UI metadata
interface:
  display_name: "Ma Skill"
  short_description: "Description courte pour l'UI"
  icon: "🔧"
  brand_color: "#FF6B35"
  default_prompt: "Utilise ma-skill pour..."

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

### Skill Invocation

Two invocation modes:

| Mode | Syntax | When |
|:-----|:-------|:-----|
| **Explicit** | `$skill-name` (e.g., `$skill-installer`, `$create-plan`) | User triggers directly |
| **Implicit** | Automatic | Codex selects the skill based on the prompt |

Commands: `/skills` to list, `$` to mention a skill.

### Disabling a Skill

```toml
[[skills.config]]
name = "ma-skill"
enabled = false
```

### Built-in System Skills

Codex ships with skills in `~/.codex/skills/.system/`:

| Skill | Description |
|:------|:------------|
| `$create-plan` | Helps plan complex tasks |
| `$skill-creator` | Helps create new skills |
| `$skill-installer` | Installs skills from a GitHub repository, a local path, or the [curated list](https://github.com/openai/skills/tree/main/skills/.curated) |

### Skills + MCP

Skills and MCP complement each other: skills define repeatable workflows, MCP connects them to external systems (issue trackers, design tools, documentation servers). Declare MCP dependencies in `agents/openai.yaml` for automatic installation.

### Cross-Platform Compatibility

A skill created for Codex can work in Claude Code, Gemini CLI, Cursor, GitHub Copilot, and 30+ other platforms thanks to the open Agent Skills standard.

## Sub-Agents (Multi-Agent)

Codex supports multi-agent workflows to parallelize tasks:

### Configuration

```toml
[features]
multi_agent = true

[agents]
# Agent role configuration
```

### Features

| Feature | Description |
|:--------|:------------|
| **`spawn_agents_on_csv`** | Task fan-out from a CSV with built-in progress/ETA |
| **Nicknames** | Each sub-agent has a nickname for clearer tracking |
| **Visible approvals** | Child approval prompts are visible in the parent |
| **Shell reuse** | Sub-agents properly reuse shell state |

### Codex as an MCP Server (multi-agent via Agents SDK)

Codex can run as an MCP server to be consumed by another agent:

```bash
codex mcp-serve
```

The Agents SDK allows creating multi-agent systems with specialized roles (e.g., Game Developer, Designer, Backend Developer, Project Manager) all using Codex as an MCP server.

## Hooks

### Commit Attribution

Codex uses an automatically managed `prepare-commit-msg` hook for co-author attribution. Configurable via `command_attribution`:

- **Default label**: standard attribution
- **Custom label**: custom label
- **Disable**: disable attribution

## Execution Modes

| Mode | `approval_policy` | `sandbox_mode` | Description |
|:-----|:-----------------|:---------------|:------------|
| **suggest** | `"untrusted"` | `"read-only"` | Suggests changes, asks approval for everything |
| **auto-edit** | `"on-request"` | `"workspace-write"` | Applies edits, asks for shell commands |
| **full-auto** | `"never"` | `"workspace-write"` | Executes everything in a secure sandbox |

### CLI Shortcuts

| Flag | Equivalent | Description |
|:-----|:-----------|:------------|
| `--full-auto` | `sandbox_mode = "workspace-write"` + `approval_policy = "on-request"` | Automatic with sandbox |
| `--yolo` | Total bypass | No sandbox or approvals (dangerous) |

## Sandbox

Codex executes commands in a sandboxed environment:

| Mode | Filesystem | Network | Usage |
|:-----|:-----------|:--------|:------|
| **read-only** (default) | Read-only | Blocked | Safe exploration |
| **workspace-write** | Write access within `writable_roots` | Blocked (configurable) | Standard development |
| **danger-full-access** | Full access | Open | Not recommended |

Configurable options: `writable_roots`, `network_access`, `exclude_tmpdir_env_var`, `exclude_slash_tmp`.

Enable network in workspace-write:
```bash
codex -c 'sandbox_workspace_write.network_access=true'
```

## CLI — Commands and Flags

### Main Commands

| Command | Description |
|:--------|:------------|
| `codex` | Interactive mode (TUI) |
| `codex "prompt"` | Direct prompt |
| `codex --model <model>` / `-m` | Model selection |
| `codex --profile <name>` | Use a profile |
| `codex --full-auto` | Full automatic mode |
| `codex --search` | Enable web search |
| `codex --config key=value` / `-c` | Config override |
| `codex auth` / `codex login` / `codex logout` | Authentication |
| `codex resume` | Resume a session |
| `codex fork` | Fork a session |
| `codex exec` | Execute a command |
| `codex apply` | Apply a patch |
| `codex tasks` | Manage tasks |
| `codex sandbox` | Manage sandbox |
| `codex features list` | List feature flags |
| `codex features enable <name>` | Enable a feature |
| `codex flags` | Manage flags |
| `codex mcp` | Manage MCP servers |
| `codex mcp-serve` | Run Codex as an MCP server |
| `codex execpolicy` | Manage execution policies |
| `codex app` | Manage applications |
| `codex completion` | Shell auto-completion |

### Slash Commands (TUI)

| Command | Description |
|:--------|:------------|
| `/model` | Change model |
| `/permissions` | Change permissions mode |
| `/skills` | List skills |
| `/review` | Code review |
| `/theme` | Change theme |
| `/copy` | Copy last response |
| `/clear` | Clear screen (without losing context) |
| `/feedback` | Send feedback |
| `/status` | Sub-agent status |
| `!<cmd>` | Shell escape (e.g., `!ls`) |

## Comparison with Claude Code

| Aspect | Codex | Claude Code |
|:-------|:------|:------------|
| **Instructions** | `AGENTS.md` (+ `AGENTS.override.md`) | `CLAUDE.md` (+ `.claude/rules/`) |
| **Configuration** | `config.toml` | `settings.json` |
| **Skills** | `.agents/skills/`, `~/.codex/skills/` | `.claude/skills/`, `~/.claude/skills/` |
| **MCP** | Yes (`config.toml`, stdio + HTTP) | Yes (`.mcp.json`, stdio + HTTP) |
| **Hooks** | Limited (commit attribution) | Yes (17 events) |
| **Sandbox** | Yes (by default, multi-level) | No (permissions system) |
| **Sub-agents** | Yes (`[agents]`, CSV fan-out, MCP server) | Yes (Explore, Plan, custom) |
| **Worktrees** | No | Yes |
| **Dual MCP role** | Yes (`codex mcp-serve`) | Yes (`claude mcp serve`) |
| **Profiles** | Yes (`[profiles]` in TOML) | No |
| **Feature flags** | Yes (`[features]`) | No |
| **Providers** | Multi-provider (OpenAI, Azure, Ollama) | Anthropic only |
| **Models** | OpenAI (GPT-4, o1, o3, gpt-5-codex) | Anthropic (Claude) |
| **Notifications** | Yes (`[notify]`) | No |

## Sources

- [OpenAI Codex — GitHub](https://github.com/openai/codex)
- [Custom instructions with AGENTS.md](https://developers.openai.com/codex/guides/agents-md)
- [Agent Skills](https://developers.openai.com/codex/skills/)
- [Configuration Reference](https://developers.openai.com/codex/config-reference)
- [Sample Configuration](https://developers.openai.com/codex/config-sample/)
- [Advanced Configuration](https://developers.openai.com/codex/config-advanced/)
- [Config Basics](https://developers.openai.com/codex/config-basic/)
- [Model Context Protocol](https://developers.openai.com/codex/mcp/)
- [CLI Reference](https://developers.openai.com/codex/cli/reference/)
- [CLI Features](https://developers.openai.com/codex/cli/features/)
- [Sandboxing](https://developers.openai.com/codex/concepts/sandboxing/)
- [Codex Changelog](https://developers.openai.com/codex/changelog/)
- [Codex Models](https://developers.openai.com/codex/models/)
- [Agent Skills Standard](https://agentskills.io)
