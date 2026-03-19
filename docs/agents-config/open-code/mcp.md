> **maconfai support: Supported** — MCP server installation for Open Code is fully implemented with format translation.

# Open Code — MCP Servers Guide

> Official source: [opencode.ai/docs/mcp-servers](https://opencode.ai/docs/mcp-servers/)

## Configuration

MCP servers are configured in `opencode.json` under the `mcp` key:

### Local MCP Servers (stdio)

```json
{
  "mcp": {
    "github": {
      "type": "local",
      "command": ["npx", "-y", "@modelcontextprotocol/server-github"],
      "environment": {
        "GITHUB_TOKEN": "ghp_..."
      }
    }
  }
}
```

### Remote MCP Servers

```json
{
  "mcp": {
    "remote-api": {
      "type": "remote",
      "url": "https://my-server.com/mcp",
      "headers": {
        "Authorization": "Bearer token"
      }
    }
  }
}
```

## Configuration Locations

| Scope   | Path                                    | Priority |
| :------ | :-------------------------------------- | :------- |
| Remote  | `.well-known/opencode` (organizational) | Lowest   |
| Global  | `~/.config/opencode/opencode.json`      | Medium   |
| Project | `./opencode.json`                       | Highest  |

Configurations merge — later configs override earlier ones only for conflicting keys.

## Per-Server Options

| Option        | Type     | Description               |
| :------------ | :------- | :------------------------ |
| `type`        | string   | `local` or `remote`       |
| `command`     | string[] | Command + args as array   |
| `url`         | string   | Remote server URL         |
| `headers`     | object   | HTTP headers              |
| `environment` | object   | Environment variables     |
| `enabled`     | boolean  | Enable/disable the server |

## Format Differences from Other Agents

| Feature        | Open Code (`opencode.json`)     | Claude Code (`.mcp.json`)       |
| :------------- | :------------------------------ | :------------------------------ |
| Config key     | `mcp`                           | `mcpServers`                    |
| Command format | `command: ["npx", "-y", "pkg"]` | `command: "npx"`, `args: [...]` |
| Env vars key   | `environment`                   | `env`                           |
| Type field     | Required (`local` / `remote`)   | Implicit                        |
| Env var syntax | `${VAR}` (bare)                 | `${VAR}` (bare)                 |

maconfai handles format translation automatically — the source `mcp.json` uses the standard format and is converted to Open Code's format during installation.

## OAuth Support

Open Code supports OAuth authentication for remote MCP servers:

```json
{
  "mcp": {
    "oauth-server": {
      "type": "remote",
      "url": "https://my-server.com/mcp",
      "oauth": {
        "clientId": "...",
        "clientSecret": "..."
      }
    }
  }
}
```

## Sources

- [Open Code MCP Servers](https://opencode.ai/docs/mcp-servers/)
- [Model Context Protocol — Specification](https://modelcontextprotocol.io)
