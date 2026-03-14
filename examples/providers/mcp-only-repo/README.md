# mcp-only-repo

Provider repository focused on **distributing MCP servers only** (no SKILL.md needed).

## Structure

```
skills/
  mcp-tools/
    mcp.json              # Declares 3 MCP servers: github, brave-search, linear
```

## What it demonstrates

- A provider with only MCP server configurations (no SKILL.md required)
- Multiple MCP servers in a single `mcp.json` (including Linear's official remote MCP)
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
