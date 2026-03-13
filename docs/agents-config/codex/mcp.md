> **maconfai support: Not supported** — MCP configuration is not managed by maconfai. Reference only.

# OpenAI Codex — MCP Servers Guide

> Official source: [developers.openai.com/codex/mcp](https://developers.openai.com/codex/mcp/)

## Configuration in `config.toml`

```toml
[mcp_servers.github]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-github"]
env = { GITHUB_TOKEN = "ghp_..." }
cwd = "."                        # Working directory (optional)
startup_timeout_sec = 10
tool_timeout_sec = 60
enabled = true

[mcp_servers.remote-api]
url = "https://my-server.com/mcp"            # SSE
# or
http_url = "https://my-server.com/mcp"       # Streamable HTTP (recommended)
bearer_token_env_var = "MY_API_TOKEN"
http_headers = { "X-Custom" = "value" }
env_http_headers = { "Authorization" = "MY_AUTH_VAR" }

[mcp_servers.disabled-example]
command = "..."
enabled = false                                 # Disabled without removing
disabled_tools = ["dangerous_tool"]             # Specific tools disabled
```

## Supported Transports

| Type | Fields | Usage |
|:-----|:-------|:------|
| `stdio` | `command` + `args` + `env` | Local processes |
| `streamable-http` | `http_url` or `url` | Remote servers |

## Per-Server Options

| Option | Type | Description |
|:-------|:-----|:------------|
| `command` | string | stdio command |
| `args` | string[] | Command arguments |
| `env` | table | Environment variables |
| `cwd` | string | Working directory |
| `url` | string | SSE URL |
| `http_url` | string | Streamable HTTP URL |
| `bearer_token_env_var` | string | Env variable for Bearer token |
| `http_headers` | table | Static HTTP headers |
| `env_http_headers` | table | HTTP headers from env variables |
| `startup_timeout_sec` | number | Startup timeout (default: 10s) |
| `tool_timeout_sec` | number | Per-tool timeout (default: 60s) |
| `enabled` | bool | Enable/disable the server |
| `disabled_tools` | string[] | List of tools to disable |

## CLI MCP

```bash
codex mcp              # List servers
codex mcp add          # Add a server
codex mcp remove       # Remove a server
codex mcp authenticate # Authenticate (OAuth)
```

## Codex as an MCP Server

```bash
codex mcp-serve
```

Exposes `codex()` and `codex-reply()` tools to other MCP clients.

## Sources

- [Model Context Protocol](https://developers.openai.com/codex/mcp/)
