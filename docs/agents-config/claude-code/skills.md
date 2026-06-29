> **maconfai support: Supported** — Skills installation and management for Claude Code is fully implemented.

# Claude Code — Skills Guide

> Official source: [code.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills)

## What is a Skill?

A Skill is a `SKILL.md` file containing instructions that Claude adds to its toolkit. Claude uses Skills automatically when they are relevant, or they can be invoked directly with `/skill-name`.

Skills follow the open [Agent Skills](https://agentskills.io) standard that works with multiple AI tools (Claude Code, Cursor, Codex, VS Code, etc.).

## Skill Structure

Each Skill is a directory with `SKILL.md` as the entry point:

```
my-skill/
├── SKILL.md           # Main instructions (required)
├── template.md        # Template that Claude can fill in
├── examples/
│   └── sample.md      # Expected output example
├── references/
│   └── api-ref.md     # Detailed documentation
└── scripts/
    └── validate.sh    # Script executable by Claude
```

## SKILL.md Format

The file contains two parts: a **YAML frontmatter** (between `---`) and **Markdown content**.

```yaml
---
name: my-skill
description: Description of what the skill does and when to use it.
---
Instructions that Claude will follow when the Skill is invoked.

1. First step
2. Second step
3. Third step
```

## Frontmatter Fields

| Field                      | Required    | Description                                                                                                                                                            |
| :------------------------- | :---------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`                     | No          | Display name. Lowercase, digits, and hyphens only (max 64 chars). If omitted, uses the directory name.                                                                 |
| `description`              | Recommended | What the Skill does and when to use it. Claude uses this field to decide when to load the Skill. Combined with `when_to_use`, truncated at 1,536 chars.                |
| `when_to_use`              | No          | Additional guidance on when Claude should invoke the Skill. Appended to `description` in the listing (counts toward the 1,536-char cap).                               |
| `argument-hint`            | No          | Hint displayed during auto-completion. E.g., `[issue-number]`, `[filename] [format]`.                                                                                  |
| `arguments`                | No          | Named positional arguments (space-separated string or YAML list). E.g., `arguments: [issue, branch]` → enables `$issue`, `$branch` substitution.                       |
| `disable-model-invocation` | No          | `true` = prevents Claude from automatically loading this Skill, and prevents preloading into subagents. For manual workflows (`/deploy`, `/commit`). Default: `false`. |
| `user-invocable`           | No          | `false` = hidden from the `/` menu. For background knowledge. Default: `true`.                                                                                         |
| `allowed-tools`            | No          | Tools Claude can use without asking permission when the Skill is active. Space-separated string or YAML list. E.g., `Read Grep Glob`.                                  |
| `disallowed-tools`         | No          | Tools removed from Claude's available pool while the Skill is active. The restriction clears when you send your next message. Space-separated string or YAML list.     |
| `model`                    | No          | Model to use when the Skill is active. `inherit` keeps the active model.                                                                                               |
| `effort`                   | No          | Reasoning effort budget. Options: `low`, `medium`, `high`, `xhigh`, `max`.                                                                                             |
| `paths`                    | No          | Glob patterns limiting when the Skill activates (e.g., `["src/**/*.ts"]`). Also accepts a comma-separated string.                                                      |
| `shell`                    | No          | Shell used for `` !`...` `` injection and script execution. `bash` (default) or `powershell` (requires `CLAUDE_CODE_USE_POWERSHELL_TOOL=1`).                           |
| `context`                  | No          | `fork` = run in an isolated sub-agent.                                                                                                                                 |
| `agent`                    | No          | Type of sub-agent to use with `context: fork`. Options: `Explore`, `Plan`, `general-purpose` (default), or a custom agent from `.claude/agents/`.                      |
| `hooks`                    | No          | Hooks tied to the Skill's lifecycle.                                                                                                                                   |

## Where to Store Skills

| Scope      | Path                               | Applies to                    |
| :--------- | :--------------------------------- | :---------------------------- |
| Enterprise | Managed settings                   | All users in the organization |
| Personal   | `~/.claude/skills/<name>/SKILL.md` | All your projects             |
| Project    | `.claude/skills/<name>/SKILL.md`   | This project only             |
| Plugin     | `<plugin>/skills/<name>/SKILL.md`  | Where the plugin is activated |

**Priority**: enterprise > personal > project. Plugin Skills use a `plugin:skill` namespace.

### Automatic Discovery (monorepo)

When working in a subdirectory, Claude Code also discovers Skills in nested `.claude/skills/`. E.g., if you are editing in `packages/frontend/`, Claude also searches in `packages/frontend/.claude/skills/`.

## Substitution Variables

| Variable               | Description                                                           |
| :--------------------- | :-------------------------------------------------------------------- |
| `$ARGUMENTS`           | All arguments passed to the invocation                                |
| `$ARGUMENTS[N]` / `$N` | Argument by index (0-based)                                           |
| `$name`                | Named argument from the `arguments` frontmatter field (e.g. `$issue`) |
| `${CLAUDE_SESSION_ID}` | Current session ID                                                    |
| `${CLAUDE_SKILL_DIR}`  | Directory containing the SKILL.md                                     |
| `${CLAUDE_EFFORT}`     | Current reasoning effort level                                        |

**Example:**

```yaml
---
name: fix-issue
description: Fixes a GitHub issue
disable-model-invocation: true
---
Fix GitHub issue $ARGUMENTS following our standards.

1. Read the issue description
2. Understand the requirements
3. Implement the fix
4. Write the tests
5. Create a commit
```

Usage: `/fix-issue 123`

## Invocation Control

| Frontmatter                      | You invoke | Claude invokes | Loaded in context                                            |
| :------------------------------- | :--------- | :------------- | :----------------------------------------------------------- |
| (default)                        | Yes        | Yes            | Description always, content on invocation                    |
| `disable-model-invocation: true` | Yes        | No             | Description not in context; full skill loads when you invoke |
| `user-invocable: false`          | No         | Yes            | Description always, content on invocation                    |

## Dynamic Context Injection

The `` !`command` `` syntax executes shell commands **before** sending to Claude:

```yaml
---
name: pr-summary
description: Summarizes changes in a PR
context: fork
agent: Explore
---

## PR Context
- Diff: !`gh pr diff`
- Comments: !`gh pr view --comments`
- Modified files: !`gh pr diff --name-only`

## Your Task
Summarize this pull request...
```

For multi-line shell output, use a fenced `!` block:

````markdown
```!
git status
git diff --stat
```
````

Shell execution can be disabled globally via the `disableSkillShellExecution` setting.

### `$ARGUMENTS` Quoting

`$ARGUMENTS` uses shell-style quoting: wrap multi-word values in quotes to keep them together (e.g., `/fix-issue "migration step 3"`).

## Execution in a Sub-agent

With `context: fork`, the Skill runs in an isolated context. The content of `SKILL.md` becomes the sub-agent's prompt (no access to conversation history).

```yaml
---
name: deep-research
description: In-depth research on a topic
context: fork
agent: Explore
---

Research $ARGUMENTS in depth:

1. Find relevant files with Glob and Grep
2. Read and analyze the code
3. Summarize the results with precise references
```

## Support Files

Keep `SKILL.md` under 500 lines. Move details into separate files:

```
my-skill/
├── SKILL.md          # Overview + navigation
├── reference.md      # Detailed API docs (loaded on demand)
├── examples.md       # Examples (loaded on demand)
└── scripts/
    └── helper.py     # Utility script (executed, not loaded)
```

Reference them from `SKILL.md`:

```markdown
## Resources

- For complete API details, see [reference.md](reference.md)
- For usage examples, see [examples.md](examples.md)
```

## Built-in Skills

| Skill                       | Description                                         |
| :-------------------------- | :-------------------------------------------------- |
| `/simplify`                 | Code review (reuse, quality, efficiency) then fixes |
| `/batch <instruction>`      | Large-scale changes in parallel via git worktrees   |
| `/debug [description]`      | Claude Code session diagnostics                     |
| `/loop [interval] <prompt>` | Runs a prompt at regular intervals                  |
| `/claude-api`               | Loads the Claude API reference for your language    |
| `/init`                     | Scaffolds a `CLAUDE.md` with codebase docs          |
| `/review`                   | Reviews a pull request                              |
| `/security-review`          | Runs a security review of pending changes           |
| `/run`                      | Launches and drives the project's app               |
| `/verify`                   | Verifies a code change works by running the app     |
| `/run-skill-generator`      | Generates a new skill via the skill creator flow    |

`/init`, `/review`, and `/security-review` are also available via the Skill tool.

## Triggering Extended Thinking

Including the keyword **`ultrathink`** in a Skill's prompt enables extended reasoning for that invocation.

## Legacy Commands (`.claude/commands/`)

Files in `.claude/commands/` continue to work and support the same frontmatter. Skills are recommended because they support additional support files. If a Skill and a command share the same name, the Skill takes priority.

## Context Budget

Skill descriptions are loaded into context. With many Skills, they can exceed the character budget (1% of the context window). Use `/context` to check. Environment variable: `SLASH_COMMAND_TOOL_CHAR_BUDGET`.

Additional settings:

- `skillListingBudgetFraction` — fraction of the context window allocated to the skill listing.
- `maxSkillDescriptionChars` — per-skill description character cap before truncation.
- `skillOverrides` — controls how user/project skills override built-ins: `"on" | "name-only" | "user-invocable-only" | "off"`.

## Skill Content Lifecycle

On auto-compaction, Claude Code retains the first 5,000 tokens of each loaded Skill, capped at a combined 25,000-token budget.

## Live Change Detection

Adding, editing, or removing a Skill takes effect within the current session — no restart required. Skills in directories added via `--add-dir` are also re-discovered live.

> **Note**: while `--add-dir` directories normally grant file-access only (not Skill/agent loading), `.claude/skills/` directories within them **are** loaded as an exception.

## Permission Rules

Skill invocations can be scoped in `settings.json` using the `Skill(...)` syntax:

```json
{
  "permissions": {
    "allow": ["Skill(pr-summary)"],
    "deny": ["Skill(deploy-*)"]
  }
}
```

`Skill(name)` matches a specific Skill; `Skill(name *)` matches any argument variant.

## Sources

- [Extend Claude with skills — Claude Code Docs](https://code.claude.com/docs/en/skills)
- [Agent Skills Overview — Claude API Docs](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
- [Anthropic Skills GitHub Repo](https://github.com/anthropics/skills)
