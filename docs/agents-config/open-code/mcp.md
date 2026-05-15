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
        "GITHUB_TOKEN": "{env:GITHUB_TOKEN}"
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
        "Authorization": "Bearer {env:MY_API_TOKEN}"
      }
    }
  }
}
```

## Environment Variable Interpolation

> **Important**: Open Code uses `{env:VARIABLE_NAME}` interpolation syntax for environment variables — NOT bare `${VAR}` as in Claude Code or shell scripts. This applies to values inside `environment`, `headers`, and any other interpolated fields.

## Configuration Locations

| Scope   | Path                               | Priority |
| :------ | :--------------------------------- | :------- |
| Global  | `~/.config/opencode/opencode.json` | Lower    |
| Project | `./opencode.json`                  | Highest  |

Configurations merge — later configs override earlier ones only for conflicting keys.

## Per-Server Options

| Option        | Type            | Description                                                                 |
| :------------ | :-------------- | :-------------------------------------------------------------------------- |
| `type`        | string          | `local` or `remote`                                                         |
| `command`     | string[]        | Command + args as array                                                     |
| `url`         | string          | Remote server URL                                                           |
| `headers`     | object          | HTTP headers                                                                |
| `environment` | object          | Environment variables                                                       |
| `enabled`     | boolean         | Enable/disable the server                                                   |
| `timeout`     | number          | Per-server request timeout in milliseconds (default `5000`)                 |
| `oauth`       | boolean\|object | `false` to opt out, or `{ clientId, clientSecret, scope }` for inline OAuth |

## Format Differences from Other Agents

| Feature        | Open Code (`opencode.json`)     | Claude Code (`.mcp.json`)       |
| :------------- | :------------------------------ | :------------------------------ |
| Config key     | `mcp`                           | `mcpServers`                    |
| Command format | `command: ["npx", "-y", "pkg"]` | `command: "npx"`, `args: [...]` |
| Env vars key   | `environment`                   | `env`                           |
| Type field     | Required (`local` / `remote`)   | Implicit                        |
| Env var syntax | `{env:VAR}`                     | `${VAR}` (bare)                 |

maconfai handles format translation automatically — the source `mcp.json` uses the standard format and is converted to Open Code's format during installation.

## Tool Management

A top-level `tools` object can enable or disable MCP tools globally using glob patterns. Per-agent overrides are supported via `agent.<name>.tools`:

```json
{
  "tools": {
    "my-mcp*": false
  },
  "agent": {
    "build": {
      "tools": {
        "my-mcp*": true
      }
    }
  }
}
```

Glob patterns match tool names; later, more specific patterns take precedence.

## CLI

```bash
opencode mcp auth <server>     # Browser-based OAuth flow for a remote server
opencode mcp list              # List configured servers and connection status
opencode mcp logout <server>   # Revoke stored credentials for a server
opencode mcp debug <server>    # Inspect connection details / troubleshoot
```

> Note: `opencode mcp add` is not currently documented in the upstream MCP page — flagged for verification.

## OAuth Support

For most OAuth-enabled MCP servers, **no inline configuration is needed**. Run `opencode mcp auth` to complete an interactive browser-based authorization; tokens are stored in `~/.local/share/opencode/mcp-auth.json` and refreshed automatically.

To opt out (for example, API-key-only servers that would otherwise trigger OAuth), set:

```json
{
  "mcp": {
    "api-key-server": {
      "type": "remote",
      "url": "https://my-server.com/mcp",
      "oauth": false,
      "headers": {
        "Authorization": "Bearer {env:MY_API_TOKEN}"
      }
    }
  }
}
```

## Sources

- [Open Code MCP Servers](https://opencode.ai/docs/mcp-servers/)
- [Model Context Protocol — Specification](https://modelcontextprotocol.io)
