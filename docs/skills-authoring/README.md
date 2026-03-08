# Guide: Configuring AI Agents (Skills, Hooks, MCP, Rules, Commands)

Reference documentation for configuring AI agents: Skills, Hooks, MCP, Rules, Sub-agents, and Commands for Claude Code, Cursor, Codex, Gemini CLI, and Amp Code.

## Structure

```
docs/skills-authoring/
│
├── README.md                          ← You are here
│
├── standard/
│   ├── agent-skills-spec.md           # Agent Skills open standard (SKILL.md)
│   │                                    Universal format, loading levels,
│   │                                    cross-tool comparison
│   │
│   └── agents-md.md                   # AGENTS.md cross-tool instruction file
│                                        Replaces/complements CLAUDE.md,
│                                        multi-tool strategy, symlinks
│
├── claude-code/
│   ├── skills.md                      # Complete Claude Code Skills guide
│   │                                    Format, frontmatter, variables, sub-agents,
│   │                                    dynamic injection, built-in skills
│   │
│   ├── best-practices.md             # Writing best practices
│   │                                    Conciseness, degrees of freedom, patterns,
│   │                                    iterative development, anti-patterns
│   │
│   ├── hooks.md                       # Claude Code Hooks guide
│   │                                    Lifecycle events, command/HTTP/
│   │                                    prompt/agent hooks, matchers, JSON I/O
│   │
│   ├── mcp.md                         # MCP servers guide
│   │                                    Configuration, transport types,
│   │                                    common servers, security
│   │
│   ├── claude-md.md                   # CLAUDE.md and configuration guide
│   │                                    Format, locations, settings.json,
│   │                                    permissions, rules, CLI
│   │
│   └── sub-agents.md                  # Sub-agents guide
│                                        Built-in types, custom agents,
│                                        agent teams, worktrees, hooks
│
├── cursor/
│   ├── rules.md                       # Cursor Rules guide
│   │                                    .mdc format, types (Always, Auto Attached,
│   │                                    Agent Requested, Manual), AGENTS.md
│   │
│   ├── skills.md                      # Cursor Agent Skills guide
│   │                                    SKILL.md format in Cursor, differences
│   │                                    from Rules, examples
│   │
│   ├── hooks.md                       # Cursor Hooks guide
│   │                                    Hook events, command/prompt handlers,
│   │                                    matchers, JSON I/O, Tab-specific hooks
│   │
│   └── mcp.md                         # Cursor MCP servers guide
│                                        Configuration, transports, comparison
│                                        with Claude Code
│
├── codex/
│   └── README.md                      # Codex (OpenAI) configuration guide
│                                        AGENTS.md, config.toml, skills, MCP,
│                                        sandbox, profiles, execution modes
│
├── gemini-cli/
│   └── README.md                      # Gemini CLI (Google) configuration guide
│                                        GEMINI.md, skills, MCP, TOML commands,
│                                        extensions, sandbox
│
└── amp-code/
    └── README.md                      # Amp Code (Sourcegraph) configuration guide
                                         AGENTS.md, skills, MCP, toolboxes,
                                         sub-agents, oracle
```

## Where to start?

### I want to understand the standard

> Read [`standard/agent-skills-spec.md`](standard/agent-skills-spec.md)
>
> Also see [`standard/agents-md.md`](standard/agents-md.md) — the cross-tool `AGENTS.md` instruction file (used by Codex, Amp, Cursor)

### I'm developing for Claude Code

1. [`claude-code/claude-md.md`](claude-code/claude-md.md) — CLAUDE.md, settings, permissions, CLI
2. [`claude-code/skills.md`](claude-code/skills.md) — the format, options, and examples
3. [`claude-code/best-practices.md`](claude-code/best-practices.md) — how to write effective Skills
4. [`claude-code/hooks.md`](claude-code/hooks.md) — automate workflows with hooks
5. [`claude-code/mcp.md`](claude-code/mcp.md) — connect MCP servers
6. [`claude-code/sub-agents.md`](claude-code/sub-agents.md) — create and use sub-agents

### I'm developing for Cursor

1. [`cursor/rules.md`](cursor/rules.md) — Rules (static context, always active)
2. [`cursor/skills.md`](cursor/skills.md) — Skills (dynamic capabilities, on demand)
3. [`cursor/hooks.md`](cursor/hooks.md) — Hooks (automation and control)
4. [`cursor/mcp.md`](cursor/mcp.md) — MCP servers

### I'm developing for Codex (OpenAI)

> Read [`codex/README.md`](codex/README.md) — AGENTS.md, config.toml, skills, MCP, sandbox

### I'm developing for Gemini CLI (Google)

> Read [`gemini-cli/README.md`](gemini-cli/README.md) — GEMINI.md, skills, MCP, commands, extensions

### I'm developing for Amp Code (Sourcegraph)

> Read [`amp-code/README.md`](amp-code/README.md) — AGENTS.md, skills, MCP, toolboxes, sub-agents

### I want to support all tools

1. Start with the standard: [`standard/agent-skills-spec.md`](standard/agent-skills-spec.md)
2. Read [`standard/agents-md.md`](standard/agents-md.md) — use `AGENTS.md` as a single instruction file across tools
3. The `SKILL.md` format is **the same** across all tools
4. The differences lie in tool-specific features (see table below)

## Summary by configuration type

### Permanent instructions

| Tool | File | Format |
|:------|:--------|:-------|
| **Claude Code** | `CLAUDE.md`, `.claude/rules/*.md` | Free-form Markdown |
| **Cursor** | `.cursor/rules/*.mdc`, `AGENTS.md` | MDC (frontmatter + markdown) |
| **Codex** | `AGENTS.md` (+ `AGENTS.override.md`) | Free-form Markdown |
| **Gemini CLI** | `GEMINI.md` (configurable name) | Free-form Markdown |
| **Amp Code** | `AGENTS.md` (fallback `CLAUDE.md`) | Markdown + YAML globs |

### Skills (on-demand capabilities)

| Tool | Project path | User path | Format |
|:------|:-------------|:-------------------|:-------|
| **Claude Code** | `.claude/skills/*/SKILL.md` | `~/.claude/skills/*/SKILL.md` | Standard Agent Skills |
| **Cursor** | `.cursor/skills/*/SKILL.md` | `~/.cursor/skills/*/SKILL.md` | Standard Agent Skills |
| **Codex** | `.agents/skills/*/SKILL.md` | `~/.codex/skills/*/SKILL.md` | Standard Agent Skills |
| **Gemini CLI** | `.gemini/skills/*/SKILL.md` | `~/.gemini/skills/*/SKILL.md` | Standard Agent Skills |
| **Amp Code** | `.agents/skills/*/SKILL.md` | `~/.config/agents/skills/*/SKILL.md` | Standard Agent Skills |

### Hooks (automation)

| Tool | Support | Configuration |
|:------|:--------|:-------------|
| **Claude Code** | Full (17 events) | `settings.json`, skills/agents frontmatter |
| **Cursor** | Yes (20+ events) | `.cursor/hooks.json` |
| **Codex** | Limited (commit attribution) | `config.toml` (`command_attribution`) |
| **Gemini CLI** | No | — |
| **Amp Code** | No | — |

### MCP (context servers)

| Tool | Support | Configuration |
|:------|:--------|:-------------|
| **Claude Code** | Yes (stdio, sse, streamable-http) | `.mcp.json`, `settings.json` |
| **Cursor** | Yes (stdio, sse) | `.cursor/mcp.json`, Settings UI |
| **Codex** | Yes (stdio, streamable-http) | `config.toml` |
| **Gemini CLI** | Yes (stdio, sse, streamable-http) | `settings.json` |
| **Amp Code** | Yes (stdio, bundled in skills) | `settings.json` |

### Sub-agents

| Tool | Support | Types |
|:------|:--------|:------|
| **Claude Code** | Yes | Explore, Plan, general-purpose, custom |
| **Cursor** | No | — |
| **Codex** | Yes | Multi-agent (`[agents]`, CSV fan-out, MCP server) |
| **Gemini CLI** | No | — |
| **Amp Code** | Yes | Task (independent sub-agents) |

### Custom commands

| Tool | Invocation | Source |
|:------|:-----------|:-------|
| **Claude Code** | `/skill-name` | Skills + `.claude/commands/` (legacy) |
| **Cursor** | `/skill-name` | Skills |
| **Codex** | — | — |
| **Gemini CLI** | `/command-name` | `.gemini/commands/` (TOML) |
| **Amp Code** | — | Toolboxes (executables) |

## Full comparison matrix

| Feature | Claude Code | Cursor | Codex | Gemini CLI | Amp Code |
|:--------|:------------|:-------|:------|:-----------|:---------|
| **Instructions** | CLAUDE.md | Rules (.mdc) + AGENTS.md | AGENTS.md | GEMINI.md | AGENTS.md |
| **Configuration** | settings.json | Settings UI | config.toml | settings.json | settings.json |
| **Skills** | ✅ | ✅ (Stable v2.4+) | ✅ | ✅ | ✅ |
| **Hooks** | ✅ (17 events) | ✅ (20+ events) | Limited (commit) | ❌ | ❌ |
| **MCP** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **MCP in skills** | ❌ | ❌ | ✅ (auto-install) | ❌ | ✅ (lazy-load) |
| **Sub-agents** | ✅ | ❌ | ✅ (multi-agent) | ❌ | ✅ (Task) |
| **Sandbox** | ❌ (permissions) | ❌ | ✅ (multi-level) | ✅ (Docker/Podman) | ❌ (permissions) |
| **Worktrees** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Shell injection** | ✅ (`` !`cmd` ``) | ❌ | ✅ (`!cmd`) | ❌ | ❌ |
| **Extensions** | Plugins | ❌ | ❌ | ✅ | ❌ |
| **Feature flags** | ❌ | ❌ | ✅ (`[features]`) | ❌ | ❌ |
| **Notifications** | ❌ | ❌ | ✅ (`[notify]`) | ❌ | ❌ |
| **Toolboxes** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Custom commands** | ✅ | ✅ | ❌ | ✅ (TOML) | ❌ |
| **Profiles** | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Oracle** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Models** | Claude | Multi-model | GPT-4/o1/o3 | Gemini | Multi-model |
