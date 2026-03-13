> **maconfai support: Not supported** — MCP configuration is not managed by maconfai. Reference only.

# Gemini CLI — MCP Servers Guide

> Official source: [geminicli.com/docs/tools/mcp-server](https://geminicli.com/docs/tools/mcp-server/)

## Configuration in `settings.json`

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
      "httpUrl": "https://my-server.com/mcp",
      "headers": {
        "Authorization": "Bearer token"
      }
    }
  }
}
```

## Supported Transports

| Type | Field | Usage |
|:-----|:------|:------|
| `stdio` | `command` + `args` + `env` | Local processes |
| `sse` | `url` | Remote servers (SSE) |
| `streamable-http` | `httpUrl` | Remote servers (recommended) |

**Priority** if multiple transports are specified: `httpUrl` > `url` > `command`.

## Per-Server Options

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

## Trust

stdio servers only connect in **trusted folders**:

```bash
gemini trust    # Mark the current folder as trusted
```

## MCP Tool Naming

Tools are prefixed with the server name: `serverAlias__actualToolName`.

## MCP Resources

Reference resources with `@` in the chat: `@server:protocol://resource/path`.

## OAuth 2.0

Gemini CLI supports OAuth 2.0 authentication for remote MCP servers.

## CLI MCP

```bash
gemini mcp add       # Add a server
gemini mcp list      # List servers
gemini mcp remove    # Remove a server
/mcp                 # Check status (in the CLI)
```

## Global MCP Configuration

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

## Sources

- [MCP Servers](https://geminicli.com/docs/tools/mcp-server/)
- [MCP Servers (GitHub Pages)](https://google-gemini.github.io/gemini-cli/docs/tools/mcp-server.html)
