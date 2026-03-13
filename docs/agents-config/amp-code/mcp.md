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
      "env": { "GITHUB_TOKEN": "ghp_..." }
    }
  }
}
```

## MCP Permissions

Granular rule-based permissions system:

```json
{
  "amp.mcpPermissions": [
    { "pattern": "github__*", "action": "allow" },
    { "pattern": "dangerous__delete_*", "action": "block" }
  ]
}
```

**First matching rule wins**; default = allow.

## MCP on the Command Line

`--mcp-config` flag for `-x` commands (without modifying config):

```bash
amp -x --mcp-config ./mcp-servers.json "prompt"
```

## Sources

- [MCP Permissions](https://ampcode.com/news/mcp-permissions)
- [Efficient MCP Tool Loading with Skills](https://ampcode.com/news/lazy-load-mcp-with-skills)
