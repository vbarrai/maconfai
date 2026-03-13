# full-featured-repo

Provider repository demonstrating **all maconfai features**: multiple skills, multiple MCP servers across skills, and skills without MCP.

## Structure

```
skills/
  api-helper/
    SKILL.md              # API development skill
    mcp.json              # Declares: github
  doc-writer/
    SKILL.md              # Documentation skill (no MCP)
  deploy-assistant/
    SKILL.md              # DevOps/deployment skill
    mcp.json              # Declares: filesystem, brave-search
```

## What it demonstrates

- 3 skills: some with MCP, one without
- 3 MCP servers spread across 2 skills (`github`, `filesystem`, `brave-search`)
- Env var default syntax: `${PROJECT_ROOT:-/tmp}`
- Interactive prompts for skill, MCP, and agent selection

## Quick test

```bash
# Interactive install — choose skills, MCP servers, and agents manually
cd examples/consumers/project-a
node --experimental-strip-types ../../../src/cli.ts install ../../providers/full-featured-repo

# Non-interactive install — everything, all agents
node --experimental-strip-types ../../../src/cli.ts install ../../providers/full-featured-repo -y

# Check results
ls .claude/skills/                   # api-helper  deploy-assistant  doc-writer
cat .mcp.json                        # github + filesystem + brave-search
cat .cursor/mcp.json                 # same, with ${env:...} syntax

# Filter: only api-helper skill + only github MCP
rm -rf .agents .claude .cursor .codex .mcp.json
node --experimental-strip-types ../../../src/cli.ts install ../../providers/full-featured-repo -y --skills=api-helper --mcps=github --agents=claude-code
cat .mcp.json                        # github only

# Cleanup
rm -rf .agents .claude .cursor .codex .mcp.json
```
