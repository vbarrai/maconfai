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
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "remote": {
      "httpUrl": "https://my-server.com/mcp",
      "headers": {
        "Authorization": "Bearer ${MY_API_TOKEN}"
      }
    }
  }
}
```

## Supported Transports

| Type              | Field                      | Usage                        |
| :---------------- | :------------------------- | :--------------------------- |
| `stdio`           | `command` + `args` + `env` | Local processes              |
| `sse`             | `url`                      | Remote servers (SSE)         |
| `streamable-http` | `httpUrl`                  | Remote servers (recommended) |

**Priority** if multiple transports are specified: `httpUrl` > `url` > `command`.

## Per-Server Options

| Key            | Type     | Description                                                   |
| :------------- | :------- | :------------------------------------------------------------ |
| `command`      | string   | Command to start the stdio server                             |
| `args`         | string[] | Command arguments                                             |
| `env`          | object   | Process environment variables                                 |
| `cwd`          | string   | Working directory                                             |
| `url`          | string   | SSE server URL                                                |
| `httpUrl`      | string   | Streamable HTTP server URL                                    |
| `headers`      | object   | HTTP headers for `url`/`httpUrl`                              |
| `timeout`      | number   | Timeout in milliseconds (default: 600,000)                    |
| `trust`        | bool     | Trust — bypass tool call confirmations                        |
| `includeTools` | string[] | Tool allowlist (if specified, only these tools are available) |
| `excludeTools` | string[] | Tool blocklist. When both `includeTools` and `excludeTools` are specified, `excludeTools` takes precedence. |

## Trust

stdio servers only connect in **trusted folders**:

```bash
gemini trust    # Mark the current folder as trusted
```

## MCP Tool Naming

Tools are exposed as `mcp_{serverName}_{toolName}` (single underscores, `mcp_` prefix). Avoid underscores in server names to keep the delimiter unambiguous.

## MCP Resources

Reference resources with `@` in the chat: `@server:protocol://resource/path`.

## Environment Variable Expansion

Gemini CLI expands `$VAR`, `${VAR}` (POSIX, all platforms), and `%VAR%` (Windows) inside `mcpServers` values. Env vars matching `*TOKEN*`, `*SECRET*`, `*PASSWORD*`, `*KEY*`, `*AUTH*`, or `*CREDENTIAL*` are automatically redacted from inherited environments.

## Schema Sanitization

Tool input schemas have `$schema`, `additionalProperties`, and problematic `anyOf` branches stripped before being exposed to the model.

## OAuth 2.0

Gemini CLI supports OAuth 2.0 authentication for remote MCP servers via:

| Field                    | Description                                                                                   |
| :----------------------- | :-------------------------------------------------------------------------------------------- |
| `authProviderType`       | Provider strategy: `dynamic_discovery`, `google_credentials`, `service_account_impersonation` |
| `targetAudience`         | OAuth audience claim                                                                          |
| `targetServiceAccount`   | Service account to impersonate                                                                |
| `oauth.scopes`           | Requested scopes                                                                              |
| `oauth.clientId`         | OAuth client ID                                                                               |
| `oauth.clientSecret`     | OAuth client secret                                                                           |
| `oauth.authorizationUrl` | Authorization endpoint                                                                        |
| `oauth.tokenUrl`         | Token endpoint                                                                                |
| `oauth.redirectUri`      | Redirect URI                                                                                  |
| `oauth.tokenParamName`   | Parameter name for token exchange _(unverified — not confirmed in current upstream docs)_     |
| `oauth.audiences`        | Allowed token audiences _(unverified — not confirmed in current upstream docs)_               |

## CLI MCP

```bash
gemini mcp add [options]         # Add a server
gemini mcp list                  # List servers
gemini mcp remove <name>         # Remove a server
gemini mcp enable <name>         # Enable a server (optionally --session)
gemini mcp disable <name>        # Disable a server (optionally --session)
/mcp                             # Check status (in the CLI)
/mcp auth [serverName]           # Authenticate a server
/mcp enable|disable <name>       # Enable/disable a server at runtime
```

Flags for `gemini mcp add`: `-s, --scope user|project` (default `project`), `-t, --transport stdio|sse|http`, `-e, --env KEY=VAL`, `-H, --header KEY=VAL`, `--timeout`, `--trust`, `--include-tools`, `--exclude-tools`.

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

| Key             | Type     | Description                           |
| :-------------- | :------- | :------------------------------------ |
| `allowed`       | string[] | Allowlist of authorized MCP servers   |
| `excluded`      | string[] | Blocklist of excluded MCP servers     |
| `serverCommand` | string   | Global command to start an MCP server |

## MCP Prompts as Slash Commands

MCP servers can expose prompts that function as slash commands in the Gemini CLI chat interface:

```
/prompt-name --arg1="value" --arg2="value"
```

Users can invoke these the same way as built-in slash commands.

## Sources

- [MCP Servers](https://geminicli.com/docs/tools/mcp-server/)
- [MCP Servers (GitHub Pages)](https://google-gemini.github.io/gemini-cli/docs/tools/mcp-server.html)
