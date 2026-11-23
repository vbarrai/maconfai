> **maconfai support: Supported** — MCP server installation for Codex is fully implemented with JSON-to-TOML format translation.

# OpenAI Codex — MCP Servers Guide

> Official source: [learn.chatgpt.com/docs/extend/mcp](https://learn.chatgpt.com/docs/extend/mcp?surface=cli) (moved from `developers.openai.com/codex/mcp`, which now redirects there)

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
environment_id = "my-remote-executor"        # defaults to "local"; registered remote executor ID
auth = "oauth"                               # "oauth" (default) | "chatgpt"

[mcp_servers.disabled-example]
command = "..."
enabled = false                                 # Disabled without removing
disabled_tools = ["dangerous_tool"]             # Specific tools disabled
enabled_tools = ["safe_tool"]                   # Allowlist (complement of disabled_tools)

```

## OAuth table

```toml
[mcp_servers.remote-api.oauth]
client_id = "..."
client_secret = "..."   # saved by `codex mcp add` when a client secret is passed
callback_url = "..."
callback_port = 8080     # overrides the global listener port for this server
```

## Top-Level Config Keys

| Key                             | Type   | Description                                                                                                      |
| :------------------------------ | :----- | :--------------------------------------------------------------------------------------------------------------- |
| `mcp_oauth_callback_port`       | number | Port used for the OAuth callback listener                                                                        |
| `mcp_oauth_callback_url`        | string | Full callback URL used during OAuth flows                                                                        |
| `mcp_optional_startup_grace_ms` | number | Grace period for optional servers at startup (default `1000`; `0` waits for each server's `startup_timeout_sec`) |
| `mcp_oauth_credentials_store`   | string | Preferred credential store for OAuth tokens (not confirmed in current upstream docs)                             |

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

| Option                            | Type              | Description                                                                                                                                                   |
| :-------------------------------- | :---------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `command`                         | string            | stdio command                                                                                                                                                 |
| `args`                            | string[]          | Command arguments                                                                                                                                             |
| `env`                             | table             | Environment variables                                                                                                                                         |
| `env_vars`                        | string[] or table | Allow/forward list of env vars. Each entry can be a plain string or `{name = "VAR", source = "local" \| "remote"}` to control where the variable is forwarded |
| `cwd`                             | string            | Working directory                                                                                                                                             |
| `url`                             | string            | Streamable HTTP URL                                                                                                                                           |
| `bearer_token_env_var`            | string            | Env variable for Bearer token                                                                                                                                 |
| `http_headers`                    | table             | Static HTTP headers                                                                                                                                           |
| `env_http_headers`                | table             | HTTP headers from env variables                                                                                                                               |
| `scopes`                          | string[]          | OAuth scopes for the server                                                                                                                                   |
| `oauth_resource`                  | string            | OAuth resource indicator (RFC 8707) (not confirmed in current upstream docs)                                                                                  |
| `environment_id`                  | string            | Defaults to `local`. Set a remote executor's registered ID to connect through it (replaces the older `experimental_environment`)                              |
| `auth`                            | string            | Streamable HTTP auth: `"oauth"` (default) or `"chatgpt"`                                                                                                      |
| `http_headers_helper`             | string            | Local command that prints a JSON object of headers; only for HTTP connections made from the local environment                                                 |
| `startup_readiness`               | string            | `"connection"` (default) requires a live connection; `"catalog"` lets a valid cached tool catalog satisfy startup                                             |
| `tools.<tool>.output_token_limit` | number            | Positive token budget for one tool's output                                                                                                                   |
| `startup_timeout_sec`             | number            | Startup timeout in seconds (default: 10s)                                                                                                                     |
| `startup_timeout_ms`              | number            | Alias of `startup_timeout_sec`, expressed in milliseconds (not confirmed in current upstream docs)                                                            |
| `tool_timeout_sec`                | number            | Per-tool timeout (default: 60s)                                                                                                                               |
| `enabled`                         | bool              | Enable/disable the server                                                                                                                                     |
| `required`                        | bool              | If `true`, fail startup if the server is unavailable                                                                                                          |
| `disabled_tools`                  | string[]          | List of tools to disable                                                                                                                                      |
| `enabled_tools`                   | string[]          | Allowlist of tools (complement of `disabled_tools`)                                                                                                           |
| `default_tools_approval_mode`     | string            | Default approval mode for all tools: `auto`, `prompt`, `writes` (prompt for tools not marked read-only), `approve`                                            |
| `tools.<tool>.approval_mode`      | string            | Per-tool override for approval mode: `auto`, `prompt`, `approve`                                                                                              |
| `instructions`                    | string            | MCP server-level instructions returned at initialization; read by Codex as additional context (not confirmed in current upstream docs)                        |

## Project-Scoped Config

A project-scoped `.codex/config.toml` is allowed for trusted projects; settings there are merged with the user-level `~/.codex/config.toml`.

## CLI MCP

```bash
codex mcp list                                # List servers
codex mcp add <name> [--env VAR=VAL ...] -- <command>  # Add a stdio server
codex mcp add <name> --url <url> [--oauth-client-id <id>] [--oauth-client-secret <secret>]  # Add a Streamable HTTP server
codex mcp login <server-name> [--no-browser] [--scopes read,write] [--oauth-client-registration auto|cimd|dcr]  # OAuth login (registration default: auto)
/mcp                                          # In-TUI command: display active servers
```

> **Note**: `codex mcp remove` and `codex mcp-serve` are not confirmed in the upstream reference — treat as unverified.

## Sources

- [Model Context Protocol](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)
