> **maconfai support: Not supported** — MCP configuration is not managed by maconfai. Reference only.

# Claude Code — MCP Servers Guide

> Official source: [code.claude.com/docs/en/mcp](https://code.claude.com/docs/en/mcp)

## What is MCP?

The **Model Context Protocol** (MCP) is an open protocol that allows Claude Code to connect to external servers providing additional tools, resources, and context. MCP enables extending Claude's capabilities with custom integrations.

## Transport Types

| Type              | Description                    | Typical usage                                                                    |
| :---------------- | :----------------------------- | :------------------------------------------------------------------------------- |
| `stdio`           | Communication via stdin/stdout | Local processes (Node.js, Python)                                                |
| `sse`             | Server-Sent Events via HTTP    | **Deprecated** — use HTTP servers instead, where available                       |
| `streamable-http` | Bidirectional HTTP streaming   | Remote servers (recommended). Also accepted as `"http"` (alias) in JSON configs. |
| `ws`              | WebSocket (persistent)         | Persistent bidirectional connections. Accepts `url`, `headers`, `headersHelper`, `timeout`, `alwaysLoad`. |

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
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
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

| Field           | Required       | Description                                                                                |
| :-------------- | :------------- | :----------------------------------------------------------------------------------------- |
| `command`       | Yes (stdio)    | Command to launch the server                                                               |
| `args`          | No             | Command arguments                                                                          |
| `env`           | No             | Environment variables                                                                      |
| `url`           | Yes (sse/http) | Remote server URL                                                                          |
| `headers`       | No             | HTTP headers for remote servers                                                            |
| `headersHelper` | No             | Shell command whose stdout produces headers dynamically (e.g. for short-lived auth tokens) |
| `oauth`         | No             | OAuth client config: `{ clientId, callbackPort, authServerMetadataUrl, scopes }`           |
| `alwaysLoad`    | No             | If `true`, the server is exempt from Tool Search deferral and its tools always load        |
| `timeout`       | No             | Per-server timeout in milliseconds per tool call. Values below 1000 are ignored; falls back to `MCP_TOOL_TIMEOUT`. |

## Scopes

| Scope               | Storage                                   | Access                 | Shareable         |
| :------------------ | :---------------------------------------- | :--------------------- | :---------------- |
| **Local** (default) | `~/.claude.json` (under the project path) | You, this project      | No                |
| **Project**         | `.mcp.json` (project root)                | The team, this project | Yes (committable) |
| **User**            | `~/.claude.json` (global)                 | You, all projects      | No                |

**Priority**: Local > Project > User.

Project-scoped servers require approval before use.

## CLI Commands `claude mcp`

```bash
# Add a server
claude mcp add --transport stdio --env API_KEY=xxx my-server -- npx -y @package/server
claude mcp add --transport http github https://api.githubcopilot.com/mcp/
claude mcp add --scope project --transport http sentry https://mcp.sentry.dev/mcp

# HTTP server with custom header and OAuth
claude mcp add --transport http --header "Authorization: Bearer $TOKEN" my-api https://api.example.com/mcp
claude mcp add --transport http --client-id my-client --callback-port 8765 --scope read,write oauth-srv https://oauth.example.com/mcp

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

Additional `claude mcp add` flags:

| Flag                  | Description                                              |
| :-------------------- | :------------------------------------------------------- |
| `--header "Name: V"`  | Adds an HTTP header (repeatable)                         |
| `--callback-port <n>` | OAuth callback port                                      |
| `--client-id <id>`    | OAuth client ID                                          |
| `--client-secret <s>` | OAuth client secret (or set `MCP_CLIENT_SECRET` env var) |
| `--scope <s>`         | OAuth scopes (comma-separated)                           |

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
    },
    "remote-api": {
      "url": "https://my-server.com/mcp",
      "headers": {
        "Authorization": "Bearer ${MY_API_TOKEN}"
      }
    }
  }
}
```

Supported syntax:

- `${VAR}` — variable value
- `${VAR:-default}` — default value if undefined

Expansion works in: `command`, `args`, `env`, `url`, `headers`.

> **Note**: when using `${CLAUDE_PROJECT_DIR}` in a project- or user-scoped `.mcp.json`, you **must** provide a default — `${CLAUDE_PROJECT_DIR:-.}` — because the variable may be unset outside an active session. Plugin-provided MCPs are exempt from this requirement.

### Where to define the variables

Variables are resolved at runtime. Define them in one of these locations:

| Method               | Location                                        | Scope                    |
| :------------------- | :---------------------------------------------- | :----------------------- |
| Shell profile        | `~/.zshrc` or `~/.bashrc`                       | All terminal sessions    |
| Claude Code settings | `~/.claude/settings.json` → `"environment"` key | All Claude Code sessions |

**Shell profile** (recommended for personal machines):

```bash
export GITHUB_TOKEN="ghp_..."
export MY_API_TOKEN="sk-..."
```

**Claude Code settings** (`~/.claude/settings.json`):

```json
{
  "environment": {
    "GITHUB_TOKEN": "ghp_...",
    "MY_API_TOKEN": "sk-..."
  }
}
```

> **Note**: Claude Code's `settings.json` is a local file not committed to any repo. It is a good place to store secrets that should not leak into shell history or dotfiles.

## Environment Variables

| Variable                      | Description                                                                                                    |
| :---------------------------- | :------------------------------------------------------------------------------------------------------------- |
| `MCP_TIMEOUT`                 | Per-server connection/request timeout                                                                          |
| `MCP_TOOL_TIMEOUT`            | Default per-tool call timeout (fallback when per-server `timeout` field is absent or below 1000)               |
| `MCP_CLIENT_SECRET`           | OAuth client secret (alternative to `--client-secret`)                                                         |
| `MCP_CONNECTION_NONBLOCKING`  | If set, MCP connection failures do not block session start                                                     |
| `ENABLE_TOOL_SEARCH`          | Tool Search deferral mode: `true` \| `false` \| `auto` \| `auto:<N>` (defer when more than N tools are loaded) |
| `ENABLE_CLAUDEAI_MCP_SERVERS` | Enable claude.ai-hosted MCP servers                                                                            |
| `CLAUDE_CODE_MCP_SERVER_NAME` | Server name override when Claude Code runs as an MCP server                                                    |
| `CLAUDE_CODE_MCP_SERVER_URL`  | Server URL override when Claude Code runs as an MCP server                                                     |

> **Reserved name**: `workspace` is reserved and cannot be used as a server name.

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
      "GITHUB_TOKEN": "${GITHUB_TOKEN}"
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
      "BRAVE_API_KEY": "${BRAVE_API_KEY}"
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
      "Authorization": "Bearer ${MY_API_TOKEN}"
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
        "hooks": [{ "type": "command", "command": "validate-mcp-write.sh" }]
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
- **Enterprise**: `managed-mcp.json` for centralized configuration (macOS: `/Library/Application Support/ClaudeCode/managed-mcp.json`, Linux: `/etc/claude-code/managed-mcp.json`, Windows: `C:\Program Files\ClaudeCode\managed-mcp.json`). Allowlist/denylist via `allowedMcpServers` / `deniedMcpServers`; entries accept `serverName`, `serverCommand`, or `serverUrl` (with wildcard URL patterns).

## Sources

- [MCP — Claude Code Docs](https://code.claude.com/docs/en/mcp)
- [Model Context Protocol — Specification](https://modelcontextprotocol.io)
- [MCP Servers — GitHub](https://github.com/modelcontextprotocol/servers)
