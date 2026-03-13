# Examples

Manual testing scenarios for maconfai using local example repositories.

## Layout

```
examples/
  providers/                         # Repos that distribute skills & MCP configs
    full-featured-repo/              # 3 skills + 3 MCP servers (the complete example)
    multi-skills-repo/               # 3 skills + 1 MCP server (postgres)
    single-skill-repo/               # 1 skill at the root (no skills/ dir)
    mcp-only-repo/                   # 1 skill + 2 MCP servers (github, brave-search)
  consumers/                         # Target projects that receive the configs
    project-a/
    project-b/
```

## Running commands

All commands use `node` directly to run the local build. From a consumer directory:

```bash
node --experimental-strip-types ../../../src/cli.ts install <path-to-provider> [flags]
```

---

## Scenario 1 — Interactive install (full-featured-repo)

The default experience — no `-y` flag, you choose everything interactively.

```bash
cd examples/consumers/project-a

node --experimental-strip-types ../../../src/cli.ts install ../../providers/full-featured-repo
```

Expected prompts:
1. **Select skills** — toggle with space: `api-helper`, `doc-writer`, `deploy-assistant`
2. **Select MCP servers** — toggle with space: `github`, `filesystem`, `brave-search`
3. **Select agents** — toggle with space: `Claude Code`, `Cursor`, `Codex`
4. **Confirm** — review summary and press y

Verify:

```bash
ls .claude/skills/
cat .mcp.json
cat .cursor/mcp.json
```

Cleanup: `rm -rf .agents .claude .cursor .codex .mcp.json`

---

## Scenario 2 — Interactive install with multi-skills-repo

```bash
cd examples/consumers/project-a

node --experimental-strip-types ../../../src/cli.ts install ../../providers/multi-skills-repo
```

Expected prompts:
1. **Select skills** — `code-review`, `test-helper`, `db-assistant`
2. **Select MCP servers** — `postgres` (only if `db-assistant` is selected)
3. **Select agents**
4. **Confirm**

Cleanup: `rm -rf .agents .claude .cursor .codex .mcp.json`

---

## Scenario 3 — Non-interactive install (all skills, all agents)

```bash
cd examples/consumers/project-a

node --experimental-strip-types ../../../src/cli.ts install ../../providers/full-featured-repo -y
```

Verify:

```bash
ls .claude/skills/                   # api-helper  deploy-assistant  doc-writer
ls .cursor/skills/                   # api-helper  deploy-assistant  doc-writer
ls .codex/skills/                    # api-helper  deploy-assistant  doc-writer
cat .mcp.json                        # github + filesystem + brave-search (bare)
cat .cursor/mcp.json                 # github + filesystem + brave-search (env-prefix)
```

Cleanup: `rm -rf .agents .claude .cursor .codex .mcp.json`

---

## Scenario 4 — Filter skills with --skills

```bash
cd examples/consumers/project-a

node --experimental-strip-types ../../../src/cli.ts install ../../providers/full-featured-repo -y --skills=api-helper,doc-writer
```

Verify:

```bash
ls .claude/skills/                   # api-helper  doc-writer  (no deploy-assistant)
cat .mcp.json                        # github only (from api-helper, no filesystem/brave-search)
```

Cleanup: `rm -rf .agents .claude .cursor .codex .mcp.json`

---

## Scenario 5 — Filter agents with --agents

```bash
cd examples/consumers/project-a

node --experimental-strip-types ../../../src/cli.ts install ../../providers/full-featured-repo -y --agents=claude-code
```

Verify:

```bash
ls .claude/skills/                   # api-helper  deploy-assistant  doc-writer
cat .mcp.json                        # github + filesystem + brave-search
test -d .cursor/skills && echo "FAIL" || echo "OK: no .cursor/skills"
test -f .cursor/mcp.json && echo "FAIL" || echo "OK: no .cursor/mcp.json"
```

Cleanup: `rm -rf .agents .claude .cursor .codex .mcp.json`

---

## Scenario 6 — Filter MCP servers with --mcps

```bash
cd examples/consumers/project-b

node --experimental-strip-types ../../../src/cli.ts install ../../providers/full-featured-repo -y --agents=claude-code,cursor --mcps=github
```

Verify:

```bash
cat .mcp.json                        # github only, "${GITHUB_TOKEN}"
cat .cursor/mcp.json                 # github only, "${env:GITHUB_TOKEN}"
grep "brave" .mcp.json && echo "FAIL" || echo "OK: no brave-search"
grep "filesystem" .mcp.json && echo "FAIL" || echo "OK: no filesystem"
```

Cleanup: `rm -rf .agents .claude .cursor .codex .mcp.json`

---

## Scenario 7 — Single skill repo (root SKILL.md, no skills/ dir)

```bash
cd examples/consumers/project-b

node --experimental-strip-types ../../../src/cli.ts install ../../providers/single-skill-repo
```

Expected: single skill `git-wizard` auto-selected, prompt for agents only.

Non-interactive variant:

```bash
node --experimental-strip-types ../../../src/cli.ts install ../../providers/single-skill-repo -y --agents=claude-code
cat .claude/skills/git-wizard/SKILL.md   # "git expert assistant"
```

Cleanup: `rm -rf .agents .claude .cursor .codex`

---

## Scenario 8 — Re-install removes unchecked skills

```bash
cd examples/consumers/project-a

# Step 1: install all 3 skills
node --experimental-strip-types ../../../src/cli.ts install ../../providers/full-featured-repo -y --agents=claude-code
ls .claude/skills/                   # api-helper  deploy-assistant  doc-writer

# Step 2: re-install with only api-helper → the other 2 are removed
node --experimental-strip-types ../../../src/cli.ts install ../../providers/full-featured-repo -y --agents=claude-code --skills=api-helper
ls .claude/skills/                   # api-helper  (only)
```

Cleanup: `rm -rf .agents .claude .cursor .codex .mcp.json`

---

## Scenario 9 — Uninstall mode (no source argument)

```bash
cd examples/consumers/project-a

# Install first
node --experimental-strip-types ../../../src/cli.ts install ../../providers/full-featured-repo -y --agents=claude-code

# Uninstall interactively
node --experimental-strip-types ../../../src/cli.ts install
```

Expected prompts:
1. Lists installed skills with their agents
2. Select skills to remove
3. Confirm removal

Cleanup: `rm -rf .agents .claude .cursor .codex .mcp.json`

---

## Scenario 10 — Install from two different providers into the same project

```bash
cd examples/consumers/project-a

# Install from full-featured-repo
node --experimental-strip-types ../../../src/cli.ts install ../../providers/full-featured-repo -y --agents=claude-code --skills=api-helper

# Install from multi-skills-repo
node --experimental-strip-types ../../../src/cli.ts install ../../providers/multi-skills-repo -y --agents=claude-code --skills=code-review
```

Verify:

```bash
ls .claude/skills/                   # api-helper  code-review
cat .mcp.json                        # github (from api-helper)
```

Cleanup: `rm -rf .agents .claude .cursor .codex .mcp.json`

---

## Scenario 11 — MCP merge from multiple providers

```bash
cd examples/consumers/project-a

# Install api-helper (brings github MCP)
node --experimental-strip-types ../../../src/cli.ts install ../../providers/full-featured-repo -y --agents=claude-code --skills=api-helper
cat .mcp.json                        # github only

# Install mcp-tools (brings github + brave-search)
# github already exists → skipped, brave-search → added
node --experimental-strip-types ../../../src/cli.ts install ../../providers/mcp-only-repo -y --agents=claude-code
cat .mcp.json                        # github + brave-search
```

Cleanup: `rm -rf .agents .claude .cursor .codex .mcp.json`

---

## Full cleanup

```bash
cd examples/consumers/project-a && rm -rf .agents .claude .cursor .codex .mcp.json
cd ../project-b && rm -rf .agents .claude .cursor .codex .mcp.json
```
