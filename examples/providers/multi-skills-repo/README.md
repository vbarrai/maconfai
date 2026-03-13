# multi-skills-repo

Provider repository distributing **3 skills** and **1 MCP server**.

## Structure

```
skills/
  code-review/
    SKILL.md              # Code review skill
  test-helper/
    SKILL.md              # Test generation skill
  db-assistant/
    SKILL.md              # Database assistant skill
    mcp.json              # Declares a PostgreSQL MCP server
```

## What it demonstrates

- Multiple skills in a single repo
- A skill with an MCP server (`db-assistant` → `postgres`)
- Skills without MCP (`code-review`, `test-helper`)

## Quick test

```bash
# Interactive — choose which skills, MCP servers, and agents
cd examples/consumers/project-a
node --experimental-strip-types ../../../src/cli.ts install ../../providers/multi-skills-repo

# Non-interactive — all skills, Claude Code only
node --experimental-strip-types ../../../src/cli.ts install ../../providers/multi-skills-repo -y --agents=claude-code
ls .claude/skills/                   # code-review  db-assistant  test-helper
cat .mcp.json                        # postgres MCP with ${DATABASE_URL}

# Non-interactive — filter to only code-review (no MCP)
rm -rf .agents .claude .cursor .codex .mcp.json
node --experimental-strip-types ../../../src/cli.ts install ../../providers/multi-skills-repo -y --skills=code-review
test -f .mcp.json && echo "FAIL" || echo "OK: no MCP (code-review has none)"

# Cleanup
rm -rf .agents .claude .cursor .codex .mcp.json
```
