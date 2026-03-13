# mcp-only-repo

Provider repository focused on **distributing MCP servers** alongside a skill.

## Structure

```
skills/
  mcp-tools/
    SKILL.md              # Lightweight skill description
    mcp.json              # Declares 2 MCP servers: github + brave-search
```

## What it demonstrates

- A skill whose main purpose is to install MCP server configurations
- Multiple MCP servers in a single `mcp.json`
- Environment variables using `${VAR}` syntax (auto-translated per agent)
- The `--mcps` flag to selectively install MCP servers

## Quick test

```bash
# Interactive — choose which MCP servers and agents
cd examples/consumers/project-b
node --experimental-strip-types ../../../src/cli.ts install ../../providers/mcp-only-repo

# Non-interactive — all MCP servers, Claude Code + Cursor
node --experimental-strip-types ../../../src/cli.ts install ../../providers/mcp-only-repo -y --agents=claude-code,cursor
cat .mcp.json                        # "${GITHUB_TOKEN}" (bare)
cat .cursor/mcp.json                 # "${env:GITHUB_TOKEN}" (env-prefix)

# Non-interactive — only github MCP, no brave-search
rm -rf .agents .claude .cursor .codex .mcp.json
node --experimental-strip-types ../../../src/cli.ts install ../../providers/mcp-only-repo -y --agents=claude-code --mcps=github
grep "brave" .mcp.json && echo "FAIL" || echo "OK: no brave-search"

# Cleanup
rm -rf .agents .claude .cursor .codex .mcp.json
```
