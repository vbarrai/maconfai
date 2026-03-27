# maconfai

![Build Size](https://img.shields.io/badge/build%20size-91.4%20kB%20min%2Bgzip-blue)
![Coverage](https://img.shields.io/badge/coverage-73%25-green)

Minimal skills manager for [Claude Code](https://docs.anthropic.com/en/docs/claude-code), [Cursor](https://cursor.com), [Codex](https://openai.com/index/introducing-codex/), and [Open Code](https://opencode.ai).

Install, update, and uninstall agent skills from GitHub repos or local directories.

## Quick start (no install needed)

```bash
npx maconfai install owner/repo
```

## Install globally

```bash
npm i -g maconfai
```

## Usage

```bash
# Install skills from a GitHub repo
maconfai install owner/repo

# Install with no prompts
maconfai install owner/repo -y

# Install from a specific branch
maconfai install owner/repo#develop
maconfai install owner/repo --branch=develop

# Install from a GitHub URL (with optional branch and subpath)
maconfai install https://github.com/owner/repo/tree/main/path/to/skills

# Install from a local directory
maconfai install ./local/path

# Interactive uninstall
maconfai install

# Check for updates and install them
maconfai check
```

### With npx

You can run maconfai without installing it globally using `npx`:

```bash
# Install skills into the current project
npx maconfai install owner/repo

# Skip prompts
npx maconfai install owner/repo -y

# Uninstall mode
npx maconfai install
```

## How it works

1. **Discover** — maconfai looks for `SKILL.md` files inside a `skills/` directory in the source.
2. **Select** — Pick which skills and agents to install to (auto-detects installed agents). Already installed skills are pre-checked; uncheck to remove.
3. **Install** — Skills are copied to a canonical `.agents/skills/` directory with symlinks to each agent's skills directory.

## Supported agents

| Agent       | Skills | MCP servers | Hooks | Skills dir          | MCP config         |
| :---------- | :----: | :---------: | :---: | :------------------ | :----------------- |
| Claude Code |   ✅   |     ✅      |  ✅   | `.claude/skills/`   | `.mcp.json`        |
| Cursor      |   ✅   |     ✅      |  ✅   | `.cursor/skills/`   | `.cursor/mcp.json` |
| Codex       |   ✅   |      —      |   —   | `.codex/skills/`    | —                  |
| Open Code   |   ✅   |     ✅      |   —   | `.opencode/skills/` | `opencode.json`    |

Canonical location: `.agents/skills/` (agent dirs are symlinked to this).

MCP format translation is handled automatically — a single `mcp.json` source is converted to each agent's native format (e.g. Open Code uses `mcp` key with array `command` and `environment` instead of `mcpServers`/`env`).

## Development

```bash
pnpm install
pnpm run dev           # Run CLI in dev mode
pnpm test              # Run tests (vitest, watch mode)
npx vitest run         # Run tests once
pnpm typecheck         # TypeScript type checking
pnpm lint              # Lint with oxlint
pnpm knip              # Detect unused code and dependencies
pnpm prettier          # Check formatting (used in CI)
pnpm prettier:format   # Format all files with Prettier
```

## License

MIT
