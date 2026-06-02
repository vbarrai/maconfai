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

# Install and mark every config as trusted (auto-updatable)
maconfai install owner/repo --trusted

# Update only trusted configs (non-trusted ones are blocked)
maconfai update

# Update absolutely everything, bypassing the trust gate
maconfai update --force
```

### Example

Install skills, MCP servers, and hooks from [`vbarrai/config-provider-official`](https://github.com/vbarrai/config-provider-official):

```bash
# Install everything interactively
npx maconfai install vbarrai/config-provider-official

# Skip prompts and install for Claude Code only
npx maconfai install vbarrai/config-provider-official -y --agents=claude-code

# Cherry-pick specific skills
npx maconfai install vbarrai/config-provider-official --skills=pre-commit-checks,simplify
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

1. **Discover** — maconfai finds skills using a waterfall strategy (first match wins):
   - `skills/<name>/SKILL.md` — multi-skill repo with a `skills/` wrapper directory
   - `skills/<name>` (extensionless file) — **remote skill reference** (see below)
   - `<name>/SKILL.md` — multi-skill repo with skills directly at root level
   - `SKILL.md` at root — single-skill repo
2. **Select** — Pick which skills and agents to install to (auto-detects installed agents). Already installed skills are pre-checked; uncheck to remove.
3. **Install** — Skills are copied to a canonical `.agents/skills/` directory with symlinks to each agent's skills directory.

## Trusted configs

Each installed config (skill, MCP server, or hook) carries a `trusted` boolean in `ai-lock.json`. It controls how `maconfai update` treats that config:

- **Trusted** — `maconfai update` fetches and installs the latest content blindly, without asking.
- **Not trusted** (the default for new installs) — `maconfai update` **blocks** the config and reports it. Nothing is changed.
- **`maconfai update --force`** — updates every config, trusted or not, bypassing the gate.

Trust is set on the installer side (never declared by the source repo, so a compromised source cannot self-certify):

| How                                     | Result                                                                   |
| :-------------------------------------- | :----------------------------------------------------------------------- |
| `maconfai install owner/repo --trusted` | Marks all installed configs as trusted                                   |
| Interactive install                     | Prompts once whether to trust the configs in this run                    |
| `maconfai install owner/repo -y`        | New configs default to non-trusted; reinstalls keep their existing trust |

Configs installed before this feature existed (no `trusted` field in the lock) are grandfathered as trusted, so `maconfai update` keeps working for them.

## Remote skill references

A `skills/<name>.yml` file turns a repo into a **skill registry** — it points to a skill hosted elsewhere without copying it.

```yaml
# skills/skill-creator.yml
source: anthropics/claude-plugins-official/plugins/skill-creator
include: [skills, mcps, hooks]
prefix: official
```

| Field     | Default    | Description                                                             |
| :-------- | :--------- | :---------------------------------------------------------------------- |
| `source`  | —          | Source string (same formats as plain string)                            |
| `include` | `[skills]` | What to pull from the remote: `skills`, `mcps`, `hooks`                 |
| `prefix`  | —          | Prefix applied to installed skill names, MCP keys, and hook group names |

With `prefix: official`, a remote skill named `skill-creator` is installed as `official-skill-creator` (directory name and frontmatter `name:` field both updated). MCP server `github` becomes `official-github`, etc.

### How it works

When installing from a registry repo, maconfai fetches each referenced skill directly from its origin. The `ai-lock.json` tracks the **remote** source, so `maconfai check` detects updates from the original repo — not the registry. Circular references (a ref pointing to another ref) are detected and skipped with a warning.

## Supported agents

| Agent       | Skills | MCP servers | Hooks | Skills dir          | MCP config           |
| :---------- | :----: | :---------: | :---: | :------------------ | :------------------- |
| Claude Code |   ✅   |     ✅      |  ✅   | `.claude/skills/`   | `.mcp.json`          |
| Cursor      |   ✅   |     ✅      |  ✅   | `.cursor/skills/`   | `.cursor/mcp.json`   |
| Codex       |   ✅   |     ✅      |   —   | `.codex/skills/`    | `.codex/config.toml` |
| Open Code   |   ✅   |     ✅      |   —   | `.opencode/skills/` | `opencode.json`      |

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
