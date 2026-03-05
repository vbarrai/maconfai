# dotai

Minimal skills manager for [Claude Code](https://docs.anthropic.com/en/docs/claude-code), [Cursor](https://cursor.com), and [Codex](https://openai.com/index/introducing-codex/).

Install, update, and uninstall agent skills from GitHub repos or local directories.

## Install

```bash
npm i -g dotai
```

## Usage

```bash
# Install skills from a GitHub repo
dotai install owner/repo

# Install globally with no prompts
dotai install owner/repo -g -y

# Install from a GitHub URL (with optional subpath)
dotai install https://github.com/owner/repo/tree/main/path/to/skills

# Install from a local directory
dotai install ./local/path

# Interactive uninstall
dotai install

# Check for updates and install them
dotai check
```

## How it works

1. **Discover** — dotai looks for `SKILL.md` files inside a `skills/` directory in the source.
2. **Select** — Pick which skills and agents to install to (auto-detects installed agents).
3. **Install** — Skills are copied to the agent's skills directory (project or global scope).
4. **Track** — Global installs are tracked in `~/.agents/.skill-lock.json` for update checking.

## Supported agents

| Agent | Project dir | Global dir |
|---|---|---|
| Claude Code | `.claude/skills/` | `~/.claude/skills/` |
| Cursor | `.cursor/skills/` | `~/.cursor/skills/` |
| Codex | `.codex/skills/` | `~/.codex/skills/` |

## License

MIT
