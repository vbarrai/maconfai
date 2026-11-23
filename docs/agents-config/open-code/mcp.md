> **maconfai support: Supported** — MCP server installation for Open Code is fully implemented with format translation.

# Open Code — MCP Servers Guide

> Official source: [opencode.ai/docs/mcp-servers](https://opencode.ai/docs/mcp-servers/) (V2, latest); V1: [opencode.ai/v1/docs/mcp-servers](https://opencode.ai/v1/docs/mcp-servers/)

> **Versions**: `opencode.ai/docs/` now documents **OpenCode V2 (latest)**; the V1 documentation lives under `opencode.ai/v1/docs/`. The sections below describe the V1 shape that maconfai writes unless a section says V2. V2 reads existing V1 config from the same locations and normalizes it in memory without rewriting the file, so V1-format files keep working (source: [opencode.ai/docs/migrate-v1](https://opencode.ai/docs/migrate-v1/)).

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

| Scope   | Path                                             | Priority |
| :------ | :----------------------------------------------- | :------- |
| Global  | `~/.config/opencode/opencode.json` (or `.jsonc`) | Lower    |
| Project | `./opencode.json` (or `./opencode.jsonc`)        | Highest  |

Both `.json` and `.jsonc` (JSON with comments) are accepted filenames. Configurations merge — later configs override earlier ones only for conflicting keys.

## Per-Server Options

| Option        | Type            | Description                                                                                                                                                     |
| :------------ | :-------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`        | string          | `local` or `remote`                                                                                                                                             |
| `command`     | string[]        | Command + args as array                                                                                                                                         |
| `url`         | string          | Remote server URL                                                                                                                                               |
| `headers`     | object          | HTTP headers                                                                                                                                                    |
| `environment` | object          | Environment variables                                                                                                                                           |
| `enabled`     | boolean         | Enable/disable the server                                                                                                                                       |
| `timeout`     | number          | Per-server request timeout in milliseconds (default `30000`); applies to requests including tool calls, connecting and fetching tools                           |
| `cwd`         | string          | Working directory for the server process; relative paths resolve from the workspace root                                                                        |
| `oauth`       | boolean\|object | `false` to opt out, or `{ clientId, clientSecret, scope }` for inline OAuth. `clientId` supports `{env:VAR_NAME}` interpolation (e.g., `"{env:MY_CLIENT_ID}"`). |

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

A top-level `tools` object enables or disables tools by name (boolean values). Per-agent overrides are supported via `agent.<name>.tools`:

```json
{
  "tools": {
    "write": false,
    "bash": false
  },
  "agent": {
    "build": {
      "tools": {
        "write": true
      }
    }
  }
}
```

Keys are tool names with boolean values. Glob patterns are supported: `"*"` matches zero or more characters, `"?"` matches exactly one character. MCP tools are addressable via `"servername_*"` (tools register with a `<servername>_` prefix).

## CLI

```bash
opencode mcp auth <server>     # Browser-based OAuth flow for a remote server
opencode mcp auth list         # Show auth status for OAuth-capable servers
opencode mcp list              # List configured servers and connection status
opencode mcp logout <server>   # Revoke stored credentials for a server
opencode mcp debug <server>    # Check auth status, HTTP connectivity and OAuth discovery (V1 page)
```

> `opencode mcp add <name>` is documented on the V2 page only (flags `--url`, `--header`, `--env`, `--global`; a local command follows `--`). `opencode mcp debug` is not documented on the V2 page.

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

## V2 (latest) differences

In V2, servers live under `mcp.servers.<name>` ("V2 does not place server names directly under `mcp`"):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "servers": {
      "my-server": {
        "type": "local",
        "command": ["npx", "-y", "@modelcontextprotocol/server-github"],
      },
      "remote-api": { "type": "remote", "url": "https://my-server.com/mcp" },
    },
  },
}
```

| Setting             | V1                                                        | V2                                                                                                                                                     |
| :------------------ | :-------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Server container    | `mcp.<name>`                                              | `mcp.servers.<name>`                                                                                                                                   |
| Enable/disable      | `"enabled": true`                                         | `"disabled": false` (inverse flag; default `false`)                                                                                                    |
| Timeout             | `"timeout": 30000`                                        | `"timeout": { "catalog": 30000, "execution": 30000 }`; defaults: `startup` 30 s, `catalog` 30 s, `execution` 12 h (`mcp.timeout` sets global defaults) |
| Remote OAuth fields | `clientId`, `clientSecret`, `callbackPort`, `redirectUri` | `client_id`, `client_secret`, `callback_port`, `redirect_uri`                                                                                          |

V2-only server fields: `codemode` (`false` exposes tools directly; default `true`), `protocol` (`"legacy"` default, `"auto"`, or `"2026-07-28"`), `pool` (share one connection across directories; default `false`). V2 OAuth also accepts `scope` (space-delimited) and `auth_server_metadata_url`; `client_id` takes priority over CIMD and DCR, and a custom `redirect_uri` disables CIMD. Permissions use a `permissions` array of `{ action, resource, effect }` rules (a wildcard such as `context7_*` matches tools named `<server>_<tool>`); a higher-precedence project config replaces an entire same-named server object. Variable substitution is `{env:NAME}` only (shell forms such as `$NAME` are not expanded).

## Sources

- [Open Code MCP Servers](https://opencode.ai/docs/mcp-servers/)
- [Model Context Protocol — Specification](https://modelcontextprotocol.io)
