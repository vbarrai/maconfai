> **maconfai support: Not supported** — MCP configuration is not managed by maconfai. Reference only.

# Amp Code — MCP Servers Guide

> Official source: [ampcode.com/manual](https://ampcode.com/manual)

## Configuration

```json
{
  "amp.mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "${GITHUB_TOKEN}" },
      "includeTools": ["search_*", "get_issue"]
    }
  }
}
```

Per-server fields include the standard `command`/`args`/`env` (stdio) or `url`/`headers` (remote), plus:

- `includeTools` — optional `string[]` of tool names or glob patterns to restrict which tools are loaded from the server.

## Remote Servers

```json
{
  "amp.mcpServers": {
    "linear": {
      "url": "https://mcp.linear.app/sse",
      "headers": { "Authorization": "Bearer ${LINEAR_TOKEN}" }
    }
  }
}
```

OAuth-enabled remote servers use the redirect URI `http://localhost:8976/oauth/callback`.

## Scopes

- **User / global settings** — entries in the user `settings.json` apply across all workspaces and load without prompting.
- **Workspace** — entries in `.amp/settings.json` apply only to that workspace and require explicit approval (via `amp mcp approve <server>` or the UI) before they are loaded.

## CLI

- `amp mcp add <name> -- <command> [args]` — register a stdio server
- `amp mcp add <name> <url>` — register a remote (HTTP/SSE) server
- `amp mcp approve <server>` — approve a workspace-scoped server
- `amp mcp doctor` — diagnose MCP server configuration and connectivity
- `amp mcp oauth login <server> [--server-url <url>] [--client-id <id>] [--client-secret <secret>] [--scopes "<s1>,<s2>"]` — authenticate with an OAuth remote server; tokens stored in `~/.amp/oauth/` and refreshed automatically
- `amp mcp oauth logout <server>` — revoke OAuth session for a remote server

## MCP Permissions

Granular rule-based permissions system. Rules match against the server's `command`/`args` (stdio) or `url` (remote) — they are **not** globs over tool names.

```json
{
  "amp.mcpPermissions": [
    { "matches": { "command": "npx", "args": "* @modelcontextprotocol/server-github*" }, "action": "allow" },
    { "matches": { "url": "https://mcp.example.com/*" }, "action": "reject" }
  ]
}
```

**First matching rule wins**; default = allow.

## MCP on the Command Line

`--mcp-config` takes an inline JSON string (no `-x` required):

```bash
amp --mcp-config '{"mcpServers":{"github":{"command":"npx","args":["-y","@modelcontextprotocol/server-github"]}}}'
```

The upstream manual documents only the inline JSON form; file-path support is not officially documented.

## Sources

- [MCP Permissions](https://ampcode.com/news/mcp-permissions)
- [Efficient MCP Tool Loading with Skills](https://ampcode.com/news/lazy-load-mcp-with-skills)
