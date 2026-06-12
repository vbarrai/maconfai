> **maconfai support: Supported** — MCP server installation for Codex is fully implemented with JSON-to-TOML format translation.

# OpenAI Codex — MCP Servers Guide

> Official source: [developers.openai.com/codex/mcp](https://developers.openai.com/codex/mcp/)

## Configuration in `config.toml`

```toml
[mcp_servers.github]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-github"]
env = { GITHUB_TOKEN = "${GITHUB_TOKEN}" }
env_vars = ["PATH", "HOME"]      # Allow/forward env vars to the server
cwd = "."                        # Working directory (optional)
startup_timeout_sec = 10
startup_timeout_ms = 10000
tool_timeout_sec = 60
enabled = true
required = false                 # If true, fail startup when server unavailable

[mcp_servers.remote-api]
url = "https://my-server.com/mcp"            # Streamable HTTP
bearer_token_env_var = "MY_API_TOKEN"
http_headers = { "X-Custom" = "value" }
env_http_headers = { "Authorization" = "MY_AUTH_VAR" }
scopes = ["read", "write"]                   # OAuth scopes
oauth_resource = "https://my-server.com"     # RFC 8707 resource indicator
experimental_environment = "remote"          # "local" | "remote"

[mcp_servers.disabled-example]
command = "..."
enabled = false                                 # Disabled without removing
disabled_tools = ["dangerous_tool"]             # Specific tools disabled
enabled_tools = ["safe_tool"]                   # Allowlist (complement of disabled_tools)

```

## Top-Level Config Keys

| Key                           | Type   | Description                                 |
| :---------------------------- | :----- | :------------------------------------------ |
| `mcp_oauth_callback_port`     | number | Port used for the OAuth callback listener   |
| `mcp_oauth_callback_url`      | string | Full callback URL used during OAuth flows   |
| `mcp_oauth_credentials_store` | string | Preferred credential store for OAuth tokens |

## Plugin-Bundled MCP Servers

Plugins can provide their own MCP servers scoped to that plugin:

```toml
[plugins."my-plugin".mcp_servers.my-server]
command = "npx"
args = ["-y", "@myplugin/server"]
```

## Supported Transports

| Type              | Fields                     | Usage           |
| :---------------- | :------------------------- | :-------------- |
| `stdio`           | `command` + `args` + `env` | Local processes |
| `streamable-http` | `url`                      | Remote servers  |

## Per-Server Options

| Option                        | Type     | Description                                                      |
| :---------------------------- | :------- | :--------------------------------------------------------------- |
| `command`                     | string   | stdio command                                                    |
| `args`                        | string[] | Command arguments                                                |
| `env`                         | table    | Environment variables                                            |
| `env_vars`                    | string[] | Allow/forward list of env vars passed through to the server      |
| `cwd`                         | string   | Working directory                                                |
| `url`                         | string   | Streamable HTTP URL                                              |
| `bearer_token_env_var`        | string   | Env variable for Bearer token                                    |
| `http_headers`                | table    | Static HTTP headers                                              |
| `env_http_headers`            | table    | HTTP headers from env variables                                  |
| `scopes`                      | string[] | OAuth scopes requested during authorization                      |
| `oauth_resource`              | string   | OAuth resource indicator (RFC 8707)                              |
| `experimental_environment`    | string   | `"local"` or `"remote"`                                          |
| `startup_timeout_sec`         | number   | Startup timeout in seconds (default: 10s)                        |
| `startup_timeout_ms`          | number   | Alias of `startup_timeout_sec`, expressed in milliseconds        |
| `tool_timeout_sec`            | number   | Per-tool timeout (default: 60s)                                  |
| `enabled`                     | bool     | Enable/disable the server                                        |
| `required`                    | bool     | If `true`, fail startup if the server is unavailable             |
| `disabled_tools`              | string[] | List of tools to disable                                         |
| `enabled_tools`               | string[] | Allowlist of tools (complement of `disabled_tools`)              |
| `default_tools_approval_mode` | string   | Default approval mode for all tools: `auto`, `prompt`, `approve` |
| `tools.<tool>.approval_mode`  | string   | Per-tool override for approval mode: `auto`, `prompt`, `approve` |

## Project-Scoped Config

A project-scoped `.codex/config.toml` is allowed for trusted projects; settings there are merged with the user-level `~/.codex/config.toml`.

## CLI MCP

```bash
codex mcp                                     # List servers
codex mcp add <name> [--env VAR=VAL ...] -- <command>  # Add a stdio server
/mcp                                          # In-TUI command: display active servers
```

> **Note**: `codex mcp remove`, `codex mcp authenticate`, and `codex mcp-serve` are not confirmed in the upstream reference — treat as unverified.

## Sources

- [Model Context Protocol](https://developers.openai.com/codex/mcp/)
