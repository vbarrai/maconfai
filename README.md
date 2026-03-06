# dotai

Minimal skills manager for [Claude Code](https://docs.anthropic.com/en/docs/claude-code), [Cursor](https://cursor.com), and [Codex](https://openai.com/index/introducing-codex/).

Install, update, and uninstall agent skills from GitHub repos or local directories.

## Quick start (no install needed)

```bash
npx dotai install owner/repo
```

## Install globally

```bash
npm i -g dotai
```

## Usage

```bash
# Install skills from a GitHub repo
dotai install owner/repo

# Install with no prompts
dotai install owner/repo -y

# Install from a GitHub URL (with optional subpath)
dotai install https://github.com/owner/repo/tree/main/path/to/skills

# Install from a local directory
dotai install ./local/path

# Interactive uninstall
dotai install

# Check for updates and install them
dotai check
```

### With npx

You can run dotai without installing it globally using `npx`:

```bash
# Install skills into the current project
npx dotai install owner/repo

# Skip prompts
npx dotai install owner/repo -y

# Uninstall mode
npx dotai install
```

## How it works

1. **Discover** — dotai looks for `SKILL.md` files inside a `skills/` directory in the source.
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
