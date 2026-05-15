> **maconfai support: Not supported** — MCP configuration is not managed by maconfai. Reference only.

# Cursor — MCP Servers Guide

> Official source: [cursor.com/docs/context/mcp](https://cursor.com/docs/context/mcp)

## What is MCP in Cursor?

The **Model Context Protocol** (MCP) allows Cursor to connect to external servers providing additional tools and context. Cursor supports MCP to extend the agent's capabilities with custom integrations (databases, APIs, internal tools).

## Configuration

### Via Cursor settings

1. Open **Cursor Settings** (⌘/Ctrl + Shift + J)
2. **MCP** section
3. Add a server with **+ Add new MCP server**

### Via `~/.cursor/mcp.json` (global)

Global configuration available across all projects:

```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    }
  }
}
```

### Via `.cursor/mcp.json` (project)

Project-level configuration, committable to the repo:

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

## Transport types

| Type              | Configuration      | Usage                                        |
| :---------------- | :----------------- | :------------------------------------------- |
| `stdio`           | `command` + `args` | Local processes (Node.js, Python)            |
| `sse`             | `url`              | Remote servers (Server-Sent Events)          |
| `streamable-http` | `url`              | Remote servers (HTTP streaming, recommended) |

**Recommendation**: `stdio` for local experimentation, `streamable-http` for everything else.

### stdio server

```json
{
  "mcpServers": {
    "my-server": {
      "type": "stdio",
      "command": "node",
      "args": ["path/to/server.js"],
      "env": {
        "API_KEY": "my-key"
      },
      "envFile": ".env"
    }
  }
}
```

- `type: "stdio"` is required (not implicit) for stdio servers.
- `envFile` (stdio-only): path to a `.env` file whose variables are loaded into the server's environment.

### Remote server (SSE / Streamable HTTP)

```json
{
  "mcpServers": {
    "remote-sse": {
      "type": "sse",
      "url": "https://my-server.com/mcp/sse"
    },
    "remote-http": {
      "url": "https://my-server.com/mcp",
      "headers": {
        "Authorization": "Bearer ${env:MY_API_TOKEN}"
      }
    }
  }
}
```

#### OAuth

Remote MCP servers can authenticate via OAuth using an `auth` object:

```json
{
  "mcpServers": {
    "remote-oauth": {
      "url": "https://my-server.com/mcp",
      "auth": {
        "CLIENT_ID": "your-client-id",
        "CLIENT_SECRET": "your-client-secret",
        "scopes": ["read", "write"]
      }
    }
  }
}
```

| Field           | Description                              |
| :-------------- | :--------------------------------------- |
| `CLIENT_ID`     | OAuth client identifier                  |
| `CLIENT_SECRET` | OAuth client secret                      |
| `scopes`        | List of OAuth scopes to request          |

The OAuth redirect URL is fixed to `cursor://anysphere.cursor-mcp/oauth/callback`.

### Environment variables

The `env` field allows passing API keys. Use `${env:VAR}` syntax to reference system variables instead of hardcoding secrets:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "${env:GITHUB_TOKEN}"
      }
    }
  }
}
```

Supported syntax:

- `${env:VAR}` — variable value
- `${env:VAR:-default}` — default value if undefined
- `${userHome}` — current user's home directory
- `${workspaceFolder}` — absolute path to the workspace root
- `${workspaceFolderBasename}` — basename of the workspace folder
- `${pathSeparator}` — OS-specific path separator
- `${/}` — alias for `${pathSeparator}`

> **Note**: Cursor uses `${env:VAR}` syntax, unlike Claude Code which uses `${VAR}`. maconfai handles this translation automatically when installing MCP servers.

Define the actual values in your shell profile (`~/.zshrc` or `~/.bashrc`):

```bash
export GITHUB_TOKEN="ghp_..."
```

## Common MCP servers

### GitHub

```json
{
  "github": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-github"],
    "env": {
      "GITHUB_TOKEN": "${env:GITHUB_TOKEN}"
    }
  }
}
```

### Filesystem

```json
{
  "filesystem": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/directory"]
  }
}
```

### Database

```json
{
  "sqlite": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-sqlite", "path/to/db.sqlite"]
  }
}
```

### Brave Search

```json
{
  "brave-search": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-brave-search"],
    "env": {
      "BRAVE_API_KEY": "${env:BRAVE_API_KEY}"
    }
  }
}
```

## Using MCP in Cursor

### Agent mode (Composer)

MCP tools are available in the **Agent mode** of the Composer. The agent can decide to use MCP tools when relevant.

### Tool approval

By default, Cursor asks for approval before executing an MCP tool. You can enable auto-approval in the settings for trusted tools. OAuth 2.0 is supported for authentication.

### Tool limit

Beyond **~40 MCP tools** loaded simultaneously, the agent loses accuracy. Unlike Claude Code (which loads tools on demand), Cursor loads all tools at startup.

### Diagnostics

- Check server status in **Cursor Settings > MCP**
- Green dot = connected, red = error
- Logs available in **Output > MCP** (⌘/Ctrl + Shift + U)

## Comparison with Claude Code

| Aspect            | Cursor                            | Claude Code                   |
| :---------------- | :-------------------------------- | :---------------------------- |
| **Configuration** | Settings UI or `.cursor/mcp.json` | `.mcp.json`, settings.json    |
| **Scopes**        | Global, project                   | User, project, managed policy |
| **Management UI** | Built-in settings                 | `/mcp` menu                   |
| **Approval**      | Dialog + auto-approve             | Permissions system            |
| **Hooks on MCP**  | No                                | Yes (`mcp__*` matchers)       |
| **Transports**    | stdio, sse, streamable-http       | stdio, http (streamable)      |
| **Tool limit**    | ~40 (all loaded at startup)       | No hard limit (lazy loading)  |
| **Dual role**     | MCP client only                   | MCP client AND server         |

## Common pitfalls

- **Missing `mcpServers` key**: if missing from the JSON, Cursor ignores the file without warning
- **Forgetting `-y` with `npx`**: the process hangs indefinitely waiting for confirmation
- **Remote environment**: Cursor communicates directly with MCP servers from the local machine -- MCP may not work over SSH

## Best practices

1. **Project**: commit `.cursor/mcp.json` to share MCP servers with the team
2. **Secrets**: use `env` variables for tokens, do not put them in `args`
3. **Scope**: keep global servers for personal tools, project-level for shared tools
4. **Performance**: only add the servers you need -- each server consumes resources

## Programmatic registration

Cursor extensions can register MCP servers programmatically via the Extension API:

```ts
vscode.cursor.mcp.registerServer(/* server config */)
```

This lets extensions contribute MCP servers dynamically rather than relying on static `mcp.json` files.

## Sources

- [Model Context Protocol — Cursor Docs](https://docs.cursor.com/context/model-context-protocol)
- [MCP Specification](https://modelcontextprotocol.io)
- [MCP Servers — GitHub](https://github.com/modelcontextprotocol/servers)
