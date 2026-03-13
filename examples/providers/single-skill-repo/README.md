# single-skill-repo

Provider repository with a **single skill at the root** (no `skills/` subdirectory).

## Structure

```
SKILL.md                  # git-wizard skill (at the root, not in skills/)
```

## What it demonstrates

- Fallback discovery: when no `skills/` directory exists, maconfai looks for a `SKILL.md` at the root
- Useful for simple, single-purpose skill repositories

## Quick test

```bash
# Interactive — single skill auto-selected, prompt for agents only
cd examples/consumers/project-b
node --experimental-strip-types ../../../src/cli.ts install ../../providers/single-skill-repo

# Non-interactive
node --experimental-strip-types ../../../src/cli.ts install ../../providers/single-skill-repo -y --agents=claude-code
cat .claude/skills/git-wizard/SKILL.md   # "git expert assistant"

# Cleanup
rm -rf .agents .claude .cursor .codex
```
