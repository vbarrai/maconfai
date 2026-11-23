> **maconfai support: Not supported** — MCP configuration is not managed by maconfai. Reference only.

# Amp Code — MCP Servers Guide

> Official source: [ampcode.com/docs/customize/mcp](https://ampcode.com/docs/customize/mcp) (settings keys: [ampcode.com/docs/cli/settings](https://ampcode.com/docs/cli/settings); the former `ampcode.com/manual` now redirects to `ampcode.com/docs`)

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

- `includeTools` — optional `string[]` of tool names or glob patterns to restrict which tools are loaded from the server (documented on the Skills page for skill-bundled servers; not listed as a config key on the MCP page).

Environment variables use `${VAR_NAME}`. `${amp:id-token}` works only in headers of HTTPS servers without OAuth configuration, not in local server `command`, `args` or `env`. `amp.tools.disable` does not apply to remote MCP definitions.

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

OAuth-enabled remote servers use the redirect URI `http://localhost:8976/oauth/callback` (for manual client registration). Amp supports Client ID Metadata Documents (CIMD) and falls back to dynamic client registration; tokens are stored in Amp's secret storage and refreshed automatically. In headless `amp --no-tui` runners, paste the full `localhost` URL into the dialog if you complete sign-in from another device.

## Scopes

- **User / global settings** — `~/.config/amp/settings.json` (or `settings.jsonc`; `--settings-file <path>` for a custom file) applies across all workspaces and loads without prompting.
- **Workspace** — the nearest `.amp/settings.json` (or `.amp/settings.jsonc`), searched upward from the working directory, applies only to that workspace and requires approval (`awaiting approval` in `amp mcp doctor`; approve via `amp mcp approve <name>` or the UI). `--mcp-config` servers do not need approval.
- **Precedence**, highest first: `--mcp-config` flag, workspace config, user config, skills. Workspace settings override user settings.

## CLI

- `amp mcp add <name> -- <command> [args]` — register a stdio server
- `amp mcp add <name> <url>` — register a remote (HTTP/SSE) server
- `amp mcp approve <server>` — approve a workspace-scoped server
- `amp mcp doctor` — diagnose MCP server configuration and connectivity
- `amp mcp oauth login <server>` (with `--server-url`, `--client-id`, `--client-secret`, `--scopes`) / `amp mcp oauth logout <server>` — manage OAuth sessions for remote servers
- `amp mcp remote <subcommand>` — manage hosted remote servers, with one scope option (`--personal`, `--workspace <workspace>`, `--project <project>`, or `--current-project`); subcommands `add` (`--auth none|bearer|oauth|workload-identity`, `--bearer-token-file`, `--oauth-client-id`, `--oauth-client-secret-file`, `--headers`, `--secret-headers`), `update` (`--disabled`, `--headers`, `--secret-headers`), `list`, `check`, `tools` (`--refresh`), `login`, `logout`, `remove` (`--yes`); `--json` works on any of them

Other documented features: tool policies per tool (Allow (default), Ask First, Disabled), elicitation support, remote server overrides (project overrides workspace, which overrides personal), a "Use in Multiplayer Threads" toggle per remote server, daily background refresh of saved remote tool lists, and the agent tools `manage_amp` (topic `remote_mcp_servers`), `reload_mcp`, `tool_search` and `code_exec`.

## MCP Permissions

Granular rule-based permissions system (`amp.mcpPermissions`, array, default `[]`; documented on the Configuration page). Rules match against the server's `command`/`args` (stdio) or `url` (remote) — they are **not** globs over tool names.

```json
{
  "amp.mcpPermissions": [
    {
      "matches": { "command": "npx", "args": "* @modelcontextprotocol/server-github*" },
      "action": "allow"
    },
    { "matches": { "url": "https://mcp.example.com/*" }, "action": "reject" }
  ]
}
```

> **Note**: `matches` uses separate `"command"` and `"args"` fields — do not conflate them into a single `"command"` glob. Valid `action` values are `"allow"` and `"reject"` (not `"block"`).

**First matching rule wins**; default = allow (if no rule matches, the server is allowed).

## MCP on the Command Line

`--mcp-config` takes an inline JSON string:

```bash
amp --mcp-config '{"mcpServers":{"github":{"command":"npx","args":["-y","@modelcontextprotocol/server-github"]}}}'
```

The upstream manual documents only the inline JSON form; file-path support is not officially documented.

## Sources

- [MCP — Amp Docs](https://ampcode.com/docs/customize/mcp)
- [Configuration — Amp Docs](https://ampcode.com/docs/cli/settings)
- [MCP Permissions](https://ampcode.com/news/mcp-permissions)
- [Efficient MCP Tool Loading with Skills](https://ampcode.com/news/lazy-load-mcp-with-skills)
