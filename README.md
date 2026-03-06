# confai

Minimal skills manager for [Claude Code](https://docs.anthropic.com/en/docs/claude-code), [Cursor](https://cursor.com), and [Codex](https://openai.com/index/introducing-codex/).

Install, update, and uninstall agent skills from GitHub repos or local directories.

## Quick start (no install needed)

```bash
npx confai install owner/repo
```

## Install globally

```bash
npm i -g confai
```

## Usage

```bash
# Install skills from a GitHub repo
confai install owner/repo

# Install with no prompts
confai install owner/repo -y

# Install from a GitHub URL (with optional subpath)
confai install https://github.com/owner/repo/tree/main/path/to/skills

# Install from a local directory
confai install ./local/path

# Interactive uninstall
confai install

# Check for updates and install them
confai check
```

### With npx

You can run confai without installing it globally using `npx`:

```bash
# Install skills into the current project
npx confai install owner/repo

# Skip prompts
npx confai install owner/repo -y

# Uninstall mode
npx confai install
```

## How it works

1. **Discover** — confai looks for `SKILL.md` files inside a `skills/` directory in the source.
2. **Select** — Pick which skills and agents to install to (auto-detects installed agents). Already installed skills are pre-checked; uncheck to remove.
3. **Install** — Skills are copied to a canonical `.agents/skills/` directory with symlinks to each agent's skills directory.

## Supported agents

| Agent | Project dir |
|---|---|
| Claude Code | `.claude/skills/` |
| Cursor | `.cursor/skills/` |
| Codex | `.codex/skills/` |

Canonical location: `.agents/skills/` (agent dirs are symlinked to this).

## License

MIT
