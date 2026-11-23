> **maconfai support: Not supported** — CLAUDE.md and settings are not managed by maconfai. Reference only.

# Claude Code — CLAUDE.md and Configuration Guide

> Official source: [code.claude.com/docs/en/claude-md](https://code.claude.com/docs/en/claude-md)

## What is CLAUDE.md?

`CLAUDE.md` is Claude Code's persistent instructions file. It contains conventions, the tech stack, useful commands, and any information Claude needs to work effectively on your project.

Claude automatically loads the contents of `CLAUDE.md` at the start of each session.

## Locations and Priority

| Scope           | Path                                                                                                                                              | Applies to                                              |
| :-------------- | :------------------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------ |
| Managed policy  | macOS: `/Library/Application Support/ClaudeCode/CLAUDE.md`, Linux: `/etc/claude-code/CLAUDE.md`, Windows: `C:\Program Files\ClaudeCode\CLAUDE.md` | All users in the organization                           |
| User            | `~/.claude/CLAUDE.md`                                                                                                                             | All your projects                                       |
| Project (root)  | `CLAUDE.md` or `.claude/CLAUDE.md`                                                                                                                | This project only                                       |
| Project (local) | `CLAUDE.local.md`                                                                                                                                 | This project (unversioned, gitignored)                  |
| Subdirectory    | `packages/frontend/CLAUDE.md`                                                                                                                     | Loaded on demand when Claude works in this subdirectory |

**Load order**: broadest to most specific (managed policy, user, project, local), so a project instruction appears in context after a user instruction. Files are concatenated, not overridden; within a directory, `CLAUDE.local.md` is appended after `CLAUDE.md`. A `CLAUDE.md` over 4 MiB is skipped entirely.

**Filename**: case-sensitive — must be exactly `CLAUDE.md` (uppercase). Target **< 200 lines** per file for better adherence.

### Automatic Discovery

Claude Code discovers `CLAUDE.md` files hierarchically:

1. File at the project root (`CLAUDE.md` or `.claude/CLAUDE.md`)
2. Files in parent subdirectories up to the root — **loaded at startup**
3. Files in nested subdirectories — **loaded on demand** when Claude works in them

The `claudeMdExcludes` setting allows excluding certain files (useful in monorepos).

### AGENTS.md Interop

Claude Code (v2.1.277+) reads `AGENTS.md` natively. By default (the `claude-md-or-agents-md` mode) it reads `AGENTS.md` only when there is no `CLAUDE.md`, `.claude/CLAUDE.md` or `CLAUDE.local.md` in the working directory or above it. `~/.claude/CLAUDE.md`, the managed `CLAUDE.md` and `.claude/rules/` files do not count for that check and keep loading alongside `AGENTS.md`.

When no `CLAUDE.md` counts, Claude reads every `AGENTS.md` and `.claude/AGENTS.md` in the working directory and the directories above it at session start, plus a subdirectory's `AGENTS.md` when Claude opens a file there that has none of the three `CLAUDE.md` files of its own. `@path` imports and `claudeMdExcludes` apply inside each `AGENTS.md`. Not read: `AGENTS.local.md`, `AGENTS.override.md`, anything under `.agents/`.

Change the behavior with the **Project instructions** setting in `/config`:

| Value                     | What Claude reads                                                                                                     |
| :------------------------ | :-------------------------------------------------------------------------------------------------------------------- |
| `claude-md-or-agents-md`  | `CLAUDE.md` files, or `AGENTS.md` when there is no `CLAUDE.md`/`CLAUDE.local.md` above. The default                   |
| `claude-md-and-agents-md` | Both: each directory's `CLAUDE.md` first, then its `AGENTS.md` (an already-loaded file is not read twice)             |
| `claude-md`               | `CLAUDE.md` files only                                                                                                |
| `managed-only`            | Only the managed `CLAUDE.md` and auto memory at launch; on-demand subdirectory files and path-scoped rules still load |

The value can also be set in `~/.claude/settings.json`, a `--settings` file or managed settings (ignored in project and local settings) as `pluginConfigs["cc-plugin-agents-md@builtin"].options.instructionFiles`. Before v2.1.285 the plugin ID was `agents-md@builtin`.

Differences from `CLAUDE.md`: `InstructionsLoaded` hooks do not fire for an `AGENTS.md` read through the setting; with `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD` set, `--add-dir` directories' `AGENTS.md` is not loaded; external `@path` imports load without a prompt once external imports were approved for the project.

When Claude does not read `AGENTS.md` directly (version before v2.1.277, built-in plugin disabled via `/plugin`, some first sessions after an upgrade), keep an `@AGENTS.md` import in a `CLAUDE.md` next to it, or symlink `CLAUDE.md → AGENTS.md`; Claude Code never reads the same file twice.

### Auto Memory

When enabled, Claude Code writes session learnings to `~/.claude/projects/<project>/memory/MEMORY.md`. The first **200 lines** (capped at **25 KB**) are loaded automatically at session start; topic files next to it are read on demand. All worktrees and subdirectories of one git repository share one memory directory. The memory is machine-local and is not loaded into subagents (a fork inherits the parent conversation). Auto memory is off by default in self-hosted-environment sessions.

Controlled by:

- `autoMemoryEnabled` (settings)
- `autoMemoryDirectory` (settings) — override the default location (absolute path or `~/…`; read from any settings scope)
- `CLAUDE_CODE_DISABLE_AUTO_MEMORY` (env var)

## Imports (`@path`)

The `@path/to/file` syntax allows importing other files into a CLAUDE.md:

```markdown
See @README.md for the project overview and @package.json for npm commands.

# Additional Instructions

- Git workflow: @docs/git-instructions.md
- Personal overrides: @~/.claude/my-project-instructions.md
```

- Relative paths resolved from the file containing the import
- Absolute paths and `~` supported
- **Max depth**: four hops of recursive imports

### HTML Comments

Block-level HTML comments (`<!-- notes -->`) are stripped from `CLAUDE.md` before the file is injected into Claude's context. They are preserved when the Read tool reads the file directly, making them useful for author notes that should not affect the model.

## Recommended Format

`CLAUDE.md` is free-form Markdown. Recommended structure:

```markdown
# CLAUDE.md

## Project

Brief description of the project and its purpose.

## Stack

- TypeScript (ESM)
- React 19
- Tailwind CSS v4
- PostgreSQL + Prisma

## Commands

- `pnpm test` — Run tests
- `pnpm build` — Build the project
- `pnpm lint` — Lint the code

## Project Structure

- `src/` — Main source code
- `src/components/` — React components
- `src/api/` — API routes
- `tests/` — Tests

## Code Conventions

- No semicolons
- Single quotes
- 2-space indentation
- Functional components only
- Naming: camelCase for variables, PascalCase for components

## Git Workflow

- Branches: `feature/`, `fix/`, `chore/`
- Commit messages: Conventional Commits
- PRs required for merging into main
```

## Best Practices

### Be Concise

Claude is intelligent — only explain what is specific to your project:

**Good**:

```markdown
## Tests

- `pnpm test` — vitest, no watch in CI
- Mocks: `src/test/mocks/`, use `vi.mock()`
```

**Bad**:

```markdown
## Tests

Tests are important for ensuring code quality.
We use vitest which is a fast testing framework for JavaScript...
```

### Include Useful Commands

Always list the essential development commands:

```markdown
## Commands

- `pnpm dev` — Development server
- `pnpm test` — Tests (vitest)
- `pnpm test:e2e` — E2E tests (Playwright)
- `pnpm lint` — ESLint + Prettier
- `pnpm type-check` — TypeScript (`tsc --noEmit`)
```

### Document Specific Patterns

```markdown
## Patterns

- API: always validate with zod before processing
- DB: use transactions for multiple writes
- Auth: `requireAuth` middleware on all protected routes
```

## Claude Code Configuration

### settings.json File

Claude Code uses `settings.json` files at multiple levels:

| File                          | Scope                       |
| :---------------------------- | :-------------------------- |
| `~/.claude/settings.json`     | User (global)               |
| `.claude/settings.json`       | Project (versionable)       |
| `.claude/settings.local.json` | Project (local, gitignored) |
| Managed policy                | Organization (admin)        |

### Main Configuration Options

```json
{
  "permissions": {
    "allow": ["Bash(npm test)", "Read", "Grep", "Glob"],
    "deny": ["Bash(rm -rf *)"]
  },
  "hooks": {},
  "mcpServers": {},
  "env": {
    "NODE_ENV": "development"
  }
}
```

| Key                   | Description                                                                 |
| :-------------------- | :-------------------------------------------------------------------------- |
| `permissions`         | Tools automatically allowed/denied                                          |
| `hooks`               | Lifecycle hooks (see [hooks.md](hooks.md))                                  |
| `mcpServers`          | MCP servers (see [mcp.md](mcp.md))                                          |
| `env`                 | Environment variables                                                       |
| `disableAllHooks`     | Disable all hooks                                                           |
| `claudeMd`            | Inline managed CLAUDE.md content (managed policy scope only)                |
| `claudeMdExcludes`    | Glob patterns of CLAUDE.md files to exclude from auto-discovery             |
| `autoMemoryEnabled`   | Enable auto-memory writes (`~/.claude/projects/<project>/memory/MEMORY.md`) |
| `autoMemoryDirectory` | Override the default auto-memory directory                                  |

### Permissions

The permissions system controls what Claude can do without asking:

```json
{
  "permissions": {
    "allow": ["Read", "Grep", "Glob", "Bash(npm test)", "Bash(pnpm lint)", "Edit"],
    "deny": ["Bash(rm -rf *)", "Bash(git push --force)"]
  }
}
```

## Rules (`.claude/rules/`)

In addition to `CLAUDE.md`, Claude Code supports rule files in `.claude/rules/`:

```
.claude/
└── rules/
    ├── testing.md       # Testing conventions
    ├── api.md           # API conventions
    └── security.md      # Security rules
```

Rule files are plain Markdown. Two loading modes:

- **Without frontmatter**: loaded at startup (always in context)
- **With `paths` frontmatter**: loaded on demand when Claude works on matching files

```markdown
---
paths: src/api/**/*.ts
---

# API Conventions

- Always validate requests with zod
- Return structured errors
```

`paths` is the only frontmatter field Claude Code reads from a rule (YAML list or comma-separated string); other fields are ignored, and unparseable frontmatter is ignored (the rule loads without `paths`).

User rules (`~/.claude/rules/`) are loaded before project rules, so a project rule appears later in context. Neither set overrides the other: keep them consistent. `.claude/rules/` supports symlinks; a symlink whose target is outside the working directory is treated like an external import and needs approval (symlinks to network paths are not followed).

## Environment Variables

| Variable                                       | Description                                                                                           |
| :--------------------------------------------- | :---------------------------------------------------------------------------------------------------- |
| `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD` | When set, CLAUDE.md files in `--add-dir` directories are also loaded                                  |
| `CLAUDE_CODE_DISABLE_AUTO_MEMORY`              | Disable auto-memory writes/loads                                                                      |
| `CLAUDE_CODE_PROJECT_DIR_NAME`                 | With `CLAUDE_CONFIG_DIR`: fixed `<project>` directory name under `<config dir>/projects/` (v2.1.234+) |
| `CLAUDE_CODE_NEW_INIT`                         | Set to `1` to enable an interactive multi-phase `/init` flow                                          |

## CLI — Commands and Flags

> **Note**: the authoritative CLI reference is [code.claude.com/docs/en/cli-reference](https://code.claude.com/docs/en/cli-reference). The tables below may be incomplete or contain entries that have shifted between versions.

### Main Commands

| Command                 | Description                     |
| :---------------------- | :------------------------------ |
| `claude`                | Interactive mode                |
| `claude "prompt"`       | With an initial prompt          |
| `claude -p "prompt"`    | Non-interactive mode (pipe/SDK) |
| `claude -c`             | Continue the last session       |
| `claude -r <session>`   | Resume a specific session       |
| `claude --agent <name>` | Launch with a specific agent    |
| `claude mcp`            | Manage MCP servers              |
| `claude auth login`     | Authentication                  |

### Common Flags

| Flag                   | Description                                   |
| :--------------------- | :-------------------------------------------- |
| `-p`, `--print`        | Non-interactive mode, output to stdout        |
| `-c`, `--continue`     | Continue the last session                     |
| `-r`, `--resume`       | Resume a session                              |
| `-y`, `--yes`          | Automatically accept all permissions          |
| `--model <model>`      | Choose the model (`opus`, `sonnet`, `haiku`)  |
| `--worktree`, `-w`     | Run in an isolated git worktree               |
| `--agent <name>`       | Use a specific agent                          |
| `--verbose`            | Verbose mode                                  |
| `--output-format`      | Output format (`text`, `json`, `stream-json`) |
| `--max-turns <n>`      | Maximum number of turns                       |
| `--max-budget-usd <n>` | Maximum budget in dollars                     |
| `--add-dir <path>`     | Add a directory to the context                |
| `--allowedTools`       | Explicitly allowed tools                      |
| `--system-prompt`      | Custom system prompt                          |

### Built-in Slash Commands

| Category          | Commands                                                     |
| :---------------- | :----------------------------------------------------------- |
| **Session**       | `/clear` `/compact` `/resume` `/fork` `/exit`                |
| **Context**       | `/context` `/memory` `/add-dir`                              |
| **Configuration** | `/config` `/permissions` `/hooks` `/mcp` `/model` `/sandbox` |
| **Navigation**    | `/diff` `/rewind` `/status` `/cost` `/usage`                 |
| **Tools**         | `/skills` `/agents` `/plugin`                                |
| **Help**          | `/help` `/doctor` `/feedback`                                |

### Keyboard Shortcuts

| Shortcut     | Action                 |
| :----------- | :--------------------- |
| `Esc`        | Cancel                 |
| `Esc` x 2    | Rewind                 |
| `Ctrl+C`     | Interrupt              |
| `Ctrl+D`     | Quit                   |
| `Ctrl+O`     | Toggle verbose mode    |
| `Ctrl+T`     | Task list              |
| `Shift+Tab`  | Switch permission mode |
| `Alt+P`      | Switch model           |
| `!` (prefix) | Direct bash mode       |
| `@`          | Mention a file         |

## Sources

- [CLAUDE.md — Claude Code Docs](https://code.claude.com/docs/en/claude-md)
- [Settings — Claude Code Docs](https://code.claude.com/docs/en/settings)
- [Permissions — Claude Code Docs](https://code.claude.com/docs/en/permissions)
