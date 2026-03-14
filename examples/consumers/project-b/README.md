# project-b

Second consumer project to test installations in isolation from project-a.

## Quick test

```bash
cd examples/consumers/project-b

# Interactive install — single-skill-repo
node --experimental-strip-types ../../../src/cli.ts install ../../providers/single-skill-repo
cat .claude/skills/git-wizard/SKILL.md

# Cleanup
rm -rf .agents .claude .cursor .codex

# Interactive install — mcp-only-repo, choose which MCP servers
node --experimental-strip-types ../../../src/cli.ts install ../../providers/mcp-only-repo

# Non-interactive with MCP filter
node --experimental-strip-types ../../../src/cli.ts install ../../providers/mcp-only-repo -y --agents=claude-code,cursor --mcps=github
cat .mcp.json                        # github only, ${GITHUB_TOKEN}
cat .cursor/mcp.json                 # github only, ${env:GITHUB_TOKEN}

# Cleanup
rm -rf .agents .claude .cursor .codex .mcp.json
```
