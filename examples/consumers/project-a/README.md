# project-a

Consumer project to test skill and MCP installations.

## Quick test

```bash
cd examples/consumers/project-a

# Interactive install — choose skills, MCP servers, and agents manually
node --experimental-strip-types ../../../src/cli.ts install ../../providers/full-featured-repo

# Non-interactive install — everything, all agents
node --experimental-strip-types ../../../src/cli.ts install ../../providers/full-featured-repo -y

# Check what was created
ls .claude/skills/                   # api-helper  deploy-assistant  doc-writer
ls -la .claude/skills/               # all symlinks → ../../.agents/skills/*
cat .mcp.json                        # github + filesystem + brave-search (bare)
cat .cursor/mcp.json                 # same servers, ${env:...} syntax

# Then install from multi-skills-repo (MCP configs are merged)
node --experimental-strip-types ../../../src/cli.ts install ../../providers/multi-skills-repo -y --agents=claude-code
cat .mcp.json                        # previous servers + postgres

# Cleanup
rm -rf .agents .claude .cursor .codex .mcp.json
```

## What gets created

```
project-a/
  .agents/skills/<name>/         # Canonical dir (source of truth)
  .claude/skills/<name>/         # Claude Code symlink → canonical
  .cursor/skills/<name>/         # Cursor symlink → canonical
  .codex/skills/<name>/          # Codex symlink → canonical
  .mcp.json                      # Claude Code MCP config
  .cursor/mcp.json               # Cursor MCP config
```
