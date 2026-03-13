> **maconfai support: Not supported** — MCP configuration is not managed by maconfai. Reference only.

# Claude Code — MCP Servers Guide

> Official source: [code.claude.com/docs/en/mcp](https://code.claude.com/docs/en/mcp)

## What is MCP?

The **Model Context Protocol** (MCP) is an open protocol that allows Claude Code to connect to external servers providing additional tools, resources, and context. MCP enables extending Claude's capabilities with custom integrations.

## Transport Types

| Type | Description | Typical usage |
|:-----|:-----------|:-------------|
| `stdio` | Communication via stdin/stdout | Local processes (Node.js, Python) |
| `sse` | Server-Sent Events via HTTP | Remote servers (legacy) |
| `streamable-http` | Bidirectional HTTP streaming | Remote servers (recommended) |

## Configuration

### `.mcp.json` File (project)

Project-level MCP configuration file, committable to the repo:

```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/directory"]
    }
  }
}
```

### User Settings (`~/.claude/settings.json`)

For global MCP servers available across all projects:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "ghp_..."
      }
    }
  }
}
```

### Project Settings (`.claude/settings.json`)

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://localhost/mydb"]
    }
  }
}
```

## Configuration Fields

| Field | Required | Description |
|:------|:---------|:------------|
| `command` | Yes (stdio) | Command to launch the server |
| `args` | No | Command arguments |
| `env` | No | Environment variables |
| `url` | Yes (sse/http) | Remote server URL |
| `headers` | No | HTTP headers for remote servers |

## Scopes

| Scope | Storage | Access | Shareable |
|:------|:--------|:-------|:----------|
| **Local** (default) | `~/.claude.json` (under the project path) | You, this project | No |
| **Project** | `.mcp.json` (project root) | The team, this project | Yes (committable) |
| **User** | `~/.claude.json` (global) | You, all projects | No |

**Priority**: Local > Project > User.

Project-scoped servers require approval before use.

## CLI Commands `claude mcp`

```bash
# Add a server
claude mcp add --transport stdio --env API_KEY=xxx my-server -- npx -y @package/server
claude mcp add --transport http github https://api.githubcopilot.com/mcp/
claude mcp add --scope project --transport http sentry https://mcp.sentry.dev/mcp

# Add from JSON
claude mcp add-json my-server '{"command": "npx", "args": ["-y", "@package/server"]}'

# Import from Claude Desktop (macOS/WSL)
claude mcp add-from-claude-desktop

# List, inspect, remove
claude mcp list
claude mcp get my-server
claude mcp remove my-server

# Reset project approval choices
claude mcp reset-project-choices
```

**Important**: flags (`--transport`, `--env`, `--scope`) must come **before** the server name. Use `--` to separate flags from server arguments.

## Interactive Menu `/mcp`

In Claude Code, type `/mcp` to:

- **View** configured servers and their status
- **Add** a new MCP server
- **Remove** an existing server
- **Restart** a server that is unresponsive
- **Authenticate** (OAuth 2.0)

## Environment Variables in `.mcp.json`

Use the `${VAR}` syntax to avoid hardcoding secrets:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

Supported syntax:
- `${VAR}` — variable value
- `${VAR:-default}` — default value if undefined

Expansion works in: `command`, `args`, `env`, `url`, `headers`.

## Common MCP Servers

### Memory

Data persistence between sessions:

```json
{
  "memory": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-memory"]
  }
}
```

### Filesystem

Controlled filesystem access:

```json
{
  "filesystem": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "/allowed/path"]
  }
}
```

### GitHub

GitHub integration (issues, PRs, repos):

```json
{
  "github": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-github"],
    "env": {
      "GITHUB_TOKEN": "ghp_your_token"
    }
  }
}
```

### PostgreSQL

Database queries:

```json
{
  "postgres": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://user:pass@localhost/db"]
  }
}
```

### Brave Search

Web search:

```json
{
  "brave-search": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-brave-search"],
    "env": {
      "BRAVE_API_KEY": "your_key"
    }
  }
}
```

### Remote Server (SSE/HTTP)

```json
{
  "remote-server": {
    "url": "https://my-server.com/mcp",
    "headers": {
      "Authorization": "Bearer my-token"
    }
  }
}
```

## MCP Tools in Hooks

MCP tools appear as regular tools with the pattern `mcp__<server>__<tool>`:

- `mcp__memory__create_entities`
- `mcp__filesystem__read_file`
- `mcp__github__search_repositories`

You can target them in hooks:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "mcp__.*__write.*",
        "hooks": [
          { "type": "command", "command": "validate-mcp-write.sh" }
        ]
      }
    ]
  }
}
```

## Claude Code as an MCP Server

Claude Code can also expose its own tools to other MCP clients:

```bash
claude mcp serve
```

## Output Limits

- Warning at **10,000 tokens** of output per tool
- Default maximum: **25,000 tokens** (configurable via `MAX_MCP_OUTPUT_TOKENS`)
- Up to **20 simultaneous servers** without noticeable degradation

## Security

- **Trust**: only install MCP servers from trusted sources
- **Tokens**: use `${VAR}` in `.mcp.json` to keep secrets out of the repo
- **Approval**: project-scoped servers require explicit approval
- **OAuth 2.0**: tokens stored and refreshed automatically
- **Permissions**: Claude Code asks for permission before using MCP tools
- **Network**: `stdio` servers run locally, `sse`/`http` can be remote
- **Audit**: use `PreToolUse` hooks to log/validate MCP calls
- **Enterprise**: `managed-mcp.json` for centralized configuration, allowlist/denylist via `allowedMcpServers` / `deniedMcpServers`

## Sources

- [MCP — Claude Code Docs](https://code.claude.com/docs/en/mcp)
- [Model Context Protocol — Specification](https://modelcontextprotocol.io)
- [MCP Servers — GitHub](https://github.com/modelcontextprotocol/servers)
