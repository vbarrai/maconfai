> **maconfai support: Not supported** — Sub-agents are not managed by maconfai. Reference only.

# Claude Code — Sub-agents Guide

> Official source: [code.claude.com/docs/en/sub-agents](https://code.claude.com/docs/en/sub-agents)

## What is a Sub-agent?

A sub-agent is an autonomous Claude instance that runs in an isolated context, with its own system prompt and limited tool access. Sub-agents allow you to parallelize tasks, isolate complex workflows, and structure work into teams.

## Built-in Sub-agent Types

| Agent | Description | Available tools |
|:------|:-----------|:----------------|
| `Explore` | Fast codebase exploration | Read, Grep, Glob, WebFetch, WebSearch |
| `Plan` | Software architect, plan design | Read, Grep, Glob, WebFetch, WebSearch |
| `general-purpose` | Versatile agent for complex tasks | All tools |

## Creating a Custom Sub-agent

### Structure

Custom agents are defined in `.claude/agents/`:

```
.claude/
└── agents/
    ├── security-reviewer.md
    ├── test-writer.md
    └── deployment.md
```

### Agent File Format

Agent files use the same format as Skills: YAML frontmatter + Markdown content.

```yaml
---
name: security-reviewer
description: Code security review. Checks for OWASP vulnerabilities.
allowed-tools: Read, Grep, Glob, WebSearch
model: claude-sonnet-4-6
---

# Security Review

You are an application security expert. Analyze the code to detect:

1. **Injection** (SQL, XSS, commands)
2. **Authentication** (tokens, sessions, passwords)
3. **Data exposure** (logs, errors, API)
4. **Configuration** (CORS, headers, HTTPS)

## Output Format

For each vulnerability found:
- **Severity**: Critical / High / Medium / Low
- **File**: path and line
- **Description**: concise explanation
- **Fix**: recommended fix
```

### Frontmatter Fields

| Field | Required | Description |
|:------|:---------|:------------|
| `name` | No | Agent name (default: filename) |
| `description` | Recommended | What the agent does and when to use it |
| `allowed-tools` | No | Tools allowed without asking permission |
| `model` | No | Model to use |
| `hooks` | No | Hooks specific to the agent's lifecycle |
| `context` | No | `fork` to isolate in a sub-agent |

## Invoking a Sub-agent

### From a Skill (`context: fork`)

```yaml
---
name: deep-research
description: In-depth research on a topic
context: fork
agent: Explore
---

Research $ARGUMENTS in depth.
Find relevant files and summarize the results.
```

### From the CLI (`--agent`)

```bash
claude --agent security-reviewer "Review the security of the auth module"
```

### Custom Agent in a Skill

```yaml
---
name: review-pr
description: Complete PR review
context: fork
agent: security-reviewer
---

Review the changes in this PR for security vulnerabilities.
Diff: !`gh pr diff`
```

## Sub-agent Hooks

### SubagentStart

Triggers when a sub-agent is launched:

```json
{
  "hooks": {
    "SubagentStart": [
      {
        "matcher": "security-reviewer",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Security review started' >> ~/audit.log"
          }
        ]
      }
    ]
  }
}
```

### SubagentStop

Triggers when a sub-agent finishes:

```json
{
  "hooks": {
    "SubagentStop": [
      {
        "matcher": "Explore",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Exploration completed' >> ~/agents.log"
          }
        ]
      }
    ]
  }
}
```

### Hooks in Agent Frontmatter

```yaml
---
name: deployment
description: Manages application deployment
allowed-tools: Bash, Read
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate-deploy-command.sh"
  Stop:
    - hooks:
        - type: command
          command: "./scripts/post-deploy-check.sh"
---

# Deployment Agent

You manage the application deployment...
```

## Agent Teams

Claude Code supports agent teams that work in parallel in isolated git worktrees:

```bash
claude --agent team-lead "Implement features A, B, and C in parallel"
```

The lead agent can delegate sub-tasks to other agents that work simultaneously on separate branches.

### Team Hooks

| Hook | Description |
|:-----|:------------|
| `TeammateIdle` | When a teammate is about to go idle |
| `WorktreeCreate` | When a worktree is created for an agent |
| `WorktreeRemove` | When a worktree is removed |

## Isolation with Worktrees

The `isolation: "worktree"` option creates a temporary git worktree so the agent works on an isolated copy of the repo:

```yaml
---
name: refactor-module
description: Module refactoring in an isolated worktree
context: fork
agent: general-purpose
---

Refactor the module $ARGUMENTS...
```

The worktree is automatically cleaned up if the agent makes no changes. If changes are made, the path and branch are returned.

## Best Practices

### Choosing the Right Agent Type

| Need | Recommended agent |
|:-----|:-----------------|
| Quick code search | `Explore` |
| Architecture planning | `Plan` |
| Complex task with tools | `general-purpose` |
| Domain-specific workflow | Custom agent |

### Writing the Prompt

1. **Clear role** — define the agent's expertise
2. **Specific task** — what it should accomplish
3. **Output format** — expected structure of results
4. **Boundaries** — what it should not do

### Allowed Tools

- **Read-only** (`Read, Grep, Glob`) for review/analysis agents
- **Write** (`Edit, Write, Bash`) for modification agents
- **Network** (`WebFetch, WebSearch`) for research agents

## Complete Example — Test Agent

```yaml
---
name: test-writer
description: Writes unit tests for modified code.
  Use after writing code to generate corresponding tests.
allowed-tools: Read, Grep, Glob, Edit, Write, Bash
model: claude-sonnet-4-6
hooks:
  Stop:
    - hooks:
        - type: command
          command: "npm test -- --run 2>&1 | tail -20"
          once: true
---

# Test Writing

You are a unit testing expert. For each modified file:

1. Read the source file
2. Identify the functions/classes to test
3. Write tests covering:
   - Nominal case
   - Edge cases
   - Error handling
4. Run the tests to verify they pass

## Conventions
- Framework: vitest
- Naming: `describe` → module, `it` → behavior
- Mocks: `vi.mock()` for external dependencies
- No `test.only` or `test.skip`
```

## Sources

- [Sub-agents — Claude Code Docs](https://code.claude.com/docs/en/sub-agents)
- [Agent Teams — Claude Code Docs](https://code.claude.com/docs/en/agent-teams)
- [Skills — Claude Code Docs](https://code.claude.com/docs/en/skills)
