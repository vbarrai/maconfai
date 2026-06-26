> **maconfai support: Supported** — Hooks can be installed via `hooks.json` in the source repository.

# Claude Code — Hooks Guide

> Official source: [code.claude.com/docs/en/hooks](https://code.claude.com/docs/en/hooks)

## What is a Hook?

Hooks are shell commands, HTTP endpoints, or LLM prompts defined by the user that run automatically at specific points in the Claude Code lifecycle. They allow you to automate workflows, validate actions, block dangerous commands, or add context.

## Hook Lifecycle

| Event                 | When it triggers                                        | Can block? |
| :-------------------- | :------------------------------------------------------ | :--------- |
| `Setup`               | Fires for `--init-only`, `--init`, `--maintenance` runs | No         |
| `SessionStart`        | At startup or when resuming a session                   | No         |
| `UserPromptSubmit`    | When a prompt is submitted, before processing by Claude | Yes        |
| `UserPromptExpansion` | When a slash command is expanded into the prompt        | Yes        |
| `PreToolUse`          | Before a tool executes. Can block it                    | Yes        |
| `PermissionRequest`   | When a permission dialog appears                        | Yes        |
| `PermissionDenied`    | When a permission is denied (supports `retry: true`)    | No         |
| `PostToolUse`         | After a tool has succeeded                              | No         |
| `PostToolUseFailure`  | After a tool has failed                                 | No         |
| `PostToolBatch`       | After a parallel batch of tool calls completes          | No         |
| `Notification`        | When Claude Code sends a notification                   | No         |
| `Elicitation`         | When a tool requests user input (MCP elicitation)       | Yes        |
| `ElicitationResult`   | After an elicitation dialog resolves                    | No         |
| `SubagentStart`       | When a sub-agent is launched                            | No         |
| `SubagentStop`        | When a sub-agent finishes                               | Yes        |
| `Stop`                | When Claude finishes responding                         | Yes        |
| `StopFailure`         | When the main loop stops due to an error                | No         |
| `TaskCreated`         | When a task is created                                  | Yes        |
| `TeammateIdle`        | When a team teammate is about to go idle                | Yes        |
| `TaskCompleted`       | When a task is marked as completed                      | Yes        |
| `InstructionsLoaded`  | When a CLAUDE.md or `.claude/rules/*.md` is loaded      | No         |
| `ConfigChange`        | When a configuration file changes during a session      | Yes        |
| `CwdChanged`          | When the current working directory changes              | No         |
| `FileChanged`         | When a tracked file changes externally                  | No         |
| `WorktreeCreate`      | When a worktree is created via `--worktree`             | Yes        |
| `WorktreeRemove`      | When a worktree is removed                              | No         |
| `PreCompact`          | Before context compaction                               | No         |
| `PostCompact`         | After context compaction                                | No         |
| `MessageDisplay`      | When an assistant message is displayed to the user      | No         |
| `SessionEnd`          | When a session ends                                     | No         |

## Configuration

Hooks are defined in JSON settings files. The configuration has three levels:

1. Choose an **event** (`PreToolUse`, `Stop`, etc.)
2. Add a **matcher** to filter when it triggers
3. Define one or more **handlers** to execute

### Hook Locations

| Location                      | Scope                         | Shareable         |
| :---------------------------- | :---------------------------- | :---------------- |
| `~/.claude/settings.json`     | All your projects             | No                |
| `.claude/settings.json`       | Project only                  | Yes (committable) |
| `.claude/settings.local.json` | Project only                  | No (gitignored)   |
| Managed policy settings       | Organization                  | Yes (admin)       |
| Plugin `hooks/hooks.json`     | When the plugin is active     | Yes               |
| Skill/Agent frontmatter       | While the component is active | Yes               |

### Configuration Format

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/block-rm.sh"
          }
        ]
      }
    ]
  }
}
```

## Handler Types

### Command (`type: "command"`)

Executes a shell command. JSON input arrives on stdin.

| Field           | Required | Description                                                                            |
| :-------------- | :------- | :------------------------------------------------------------------------------------- |
| `type`          | Yes      | `"command"`                                                                            |
| `command`       | Yes      | Shell command to execute (shell form when `args` is omitted)                           |
| `args`          | No       | Argument list — enables exec form (no shell), vs shell form when only `command` is set |
| `timeout`       | No       | Seconds before cancellation (default: 600)                                             |
| `async`         | No       | If `true`, runs in the background without blocking                                     |
| `asyncRewake`   | No       | If `true` (async only), re-wakes Claude when the hook completes                        |
| `shell`         | No       | Shell to execute in: `bash` (default) or `powershell`                                  |
| `statusMessage` | No       | Message displayed during execution                                                     |
| `once`          | No       | If `true`, runs only once per session                                                  |
| `if`            | No       | Permission-rule filter — runs only when the active permission rules match              |

### HTTP (`type: "http"`)

Sends the JSON input as a POST to a URL.

| Field            | Required | Description                                                                   |
| :--------------- | :------- | :---------------------------------------------------------------------------- |
| `type`           | Yes      | `"http"`                                                                      |
| `url`            | Yes      | Endpoint URL                                                                  |
| `timeout`        | No       | Seconds before cancellation (default: 600; `UserPromptSubmit` defaults to 30) |
| `headers`        | No       | HTTP headers (supports `$VAR_NAME` for env variables)                         |
| `allowedEnvVars` | No       | Environment variables allowed in headers                                      |
| `statusMessage`  | No       | Message displayed during execution                                            |

### Prompt (`type: "prompt"`)

Sends a prompt to a Claude model for single-turn evaluation.

| Field     | Required | Description                                 |
| :-------- | :------- | :------------------------------------------ |
| `type`    | Yes      | `"prompt"`                                  |
| `prompt`  | Yes      | Prompt text. `$ARGUMENTS` = hook JSON input |
| `model`   | No       | Model to use (default: fast model)          |
| `timeout` | No       | Seconds before cancellation (default: 30)   |

### MCP Tool (`type: "mcp_tool"`)

Invokes a tool exposed by a configured MCP server.

| Field           | Required | Description                           |
| :-------------- | :------- | :------------------------------------ |
| `type`          | Yes      | `"mcp_tool"`                          |
| `server`        | Yes      | MCP server name                       |
| `tool`          | Yes      | Tool name on that server              |
| `input`         | No       | Input object passed to the tool       |
| `statusMessage` | No       | Message displayed during execution    |
| `once`          | No       | If `true`, runs only once per session |

### Agent (`type: "agent"`)

Launches a sub-agent with tool access (Read, Grep, Glob) to verify conditions.

| Field     | Required | Description                               |
| :-------- | :------- | :---------------------------------------- |
| `type`    | Yes      | `"agent"`                                 |
| `prompt`  | Yes      | Sub-agent prompt                          |
| `model`   | No       | Model to use                              |
| `timeout` | No       | Seconds before cancellation (default: 60) |

## Matchers (Filters)

The `matcher` field is a regex that filters when the hook triggers. Use `"*"`, `""`, or omit `matcher` to match everything.

| Event                                            | What the matcher filters | Examples                                                                                                                                                                            |
| :----------------------------------------------- | :----------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PreToolUse`, `PostToolUse`, `PermissionRequest` | Tool name                | `Bash`, `Edit\|Write`, `mcp__.*`                                                                                                                                                    |
| `SessionStart`                                   | How the session started  | `startup`, `resume`, `clear`, `compact`                                                                                                                                             |
| `SessionEnd`                                     | Why the session ended    | `clear`, `resume`, `logout`, `prompt_input_exit`, `bypass_permissions_disabled`, `other`                                                                                            |
| `Notification`                                   | Notification type        | `permission_prompt`, `idle_prompt`, `auth_success`, `elicitation_dialog`, `elicitation_complete`, `elicitation_response`                                                            |
| `SubagentStart`, `SubagentStop`                  | Agent type               | `Bash`, `Explore`, `Plan`                                                                                                                                                           |
| `ConfigChange`                                   | Config source            | `user_settings`, `project_settings`, `local_settings`, `policy_settings`, `skills`                                                                                                  |
| `InstructionsLoaded`                             | Load trigger             | `session_start`, `nested_traversal`, `path_glob_match`, `include`, `compact`                                                                                                        |
| `PreCompact`                                     | Trigger                  | `manual`, `auto`                                                                                                                                                                    |
| `StopFailure`                                    | Failure reason           | `rate_limit`, `authentication_failed`, `oauth_org_not_allowed`, `billing_error`, `invalid_request`, `server_error`, `max_output_tokens`, `unknown`, `overloaded`, `model_not_found` |
| `FileChanged`                                    | Watched filenames        | Literal filename watch list — **not** a regex or glob                                                                                                                               |

### Matcher Semantics

A matcher containing only letters, digits, `_`, spaces, `,`, or `|` is matched as an exact string (or union of exact strings). Any other character turns the matcher into a regex.

> **Caution (fail-open)**: patterns with arguments (e.g. `Bash(git push *)`) fail open — they match every tool call, not just the specified argument pattern. Use the `if` field for argument-level filtering instead.

### Matcher for MCP Tools

MCP tools follow the pattern `mcp__<server>__<tool>`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "mcp__memory__.*",
        "hooks": [{ "type": "command", "command": "echo 'Memory op' >> ~/mcp.log" }]
      }
    ]
  }
}
```

## JSON Input/Output

### Common Input Fields

All hooks receive these fields as JSON (stdin for command, body for HTTP):

| Field             | Description                                                                               |
| :---------------- | :---------------------------------------------------------------------------------------- |
| `session_id`      | Session identifier                                                                        |
| `transcript_path` | Path to the conversation JSON                                                             |
| `cwd`             | Current working directory                                                                 |
| `permission_mode` | Permission mode: `default`, `plan`, `acceptEdits`, `auto`, `dontAsk`, `bypassPermissions` |
| `hook_event_name` | Event name                                                                                |
| `model`           | Active model identifier (present in `SessionStart` and other events)                      |
| `effort`          | Reasoning effort, shape `{level: low\|medium\|high\|xhigh\|max}`                          |

Additional fields for sub-agents:

| Field        | Description                          |
| :----------- | :----------------------------------- |
| `agent_id`   | Unique sub-agent identifier          |
| `agent_type` | Agent name (`Explore`, `Plan`, etc.) |

### Exit Codes (command hooks)

| Code      | Meaning                                                                                                                                                                                                                                                                                                                                                                           |
| :-------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **0**     | Success. Claude Code parses stdout for optional JSON                                                                                                                                                                                                                                                                                                                              |
| **2**     | Blocks the action for the events that support blocking (`PreToolUse`, `PermissionRequest`, `UserPromptSubmit`, `UserPromptExpansion`, `Stop`, `SubagentStop`, `TeammateIdle`, `TaskCreated`, `TaskCompleted`, `ConfigChange`, `PreCompact`, `Elicitation`, `ElicitationResult`, `WorktreeCreate`); for non-blocking events, exit 2 just shows stderr to the user |
| **Other** | Non-blocking error. stderr displayed in verbose mode                                                                                                                                                                                                                                                                                                                              |

### JSON Output

On exit 0, stdout JSON can control behavior:

| Field              | Default | Description                                            |
| :----------------- | :------ | :----------------------------------------------------- |
| `continue`         | `true`  | If `false`, Claude stops all processing                |
| `stopReason`       | —       | Message displayed when `continue: false`               |
| `suppressOutput`   | `false` | If `true`, hides stdout from verbose mode              |
| `systemMessage`    | —       | Warning message displayed to the user                  |
| `decision`         | —       | `"block"` to block the action (certain events)         |
| `reason`           | —       | Reason for blocking                                    |
| `terminalSequence` | —       | Raw terminal escape sequence written to the user's TTY |

### PreToolUse Decision Control

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Destructive command blocked"
  }
}
```

`permissionDecision` options: `"allow"`, `"deny"`, `"ask"` (escalate to the user), `"defer"` (pause tool execution — pair with the `AskUserQuestion` flow).

`PreToolUse` hooks may also return `updatedInput` (mutated tool input) and `additionalContext` (extra prompt context).

### Other Event Output

- `PostToolUse`: `updatedToolOutput` (for MCP tools — replaces old `updatedMCPToolOutput`), `additionalContext`.
- `UserPromptSubmit`: `sessionTitle`, `additionalContext`.
- `SessionStart`: `watchPaths` (array of paths to watch for `FileChanged` events), `reloadSkills` (if `true`, triggers a skills reload), `initialUserMessage` (auto-submitted user message at session start).
- `PermissionDenied`: `retry: true` to retry the tool call after the user revisits permissions.
- `PermissionRequest`: `decision` object with `behavior` (`allow | deny | ask`) and `updatedInput` (mutated tool input). _Additional decision sub-fields are not documented upstream._
- `Elicitation` / `ElicitationResult`: `action` (`accept | decline | cancel`) and `content`.
- `WorktreeCreate`: returns the worktree path (stdout or `worktreePath`).

### Output Caps, Dedup, and HTTP Semantics

- **Output cap**: hook stdout/stderr over 10,000 chars is truncated; the full payload is saved to a file with a preview.
- **Deduplication**: identical handler definitions registered multiple times are executed once per event. Command hooks dedupe by `command+args`; HTTP hooks dedupe by `url`.
- **HTTP hooks**: non-2xx responses are non-blocking. To block, return 2xx with `decision: "block"` or an appropriate `hookSpecificOutput`.

## Environment Variables

| Variable                | Description                                                                                                                           |
| :---------------------- | :------------------------------------------------------------------------------------------------------------------------------------ |
| `$CLAUDE_PROJECT_DIR`   | Project root                                                                                                                          |
| `${CLAUDE_PLUGIN_ROOT}` | Plugin root                                                                                                                           |
| `${CLAUDE_PLUGIN_DATA}` | Plugin-scoped data directory                                                                                                          |
| `$CLAUDE_CODE_REMOTE`   | `"true"` in a remote web environment                                                                                                  |
| `$CLAUDE_ENV_FILE`      | Path to a file available in `SessionStart`, `CwdChanged`, `FileChanged` where hooks can persist env vars for subsequent Bash commands |
| `$CLAUDE_EFFORT`        | Current reasoning effort level (`low`, `medium`, `high`, `xhigh`, `max`)                                                              |

## Hooks in Skills and Agents

Hooks can be defined in the frontmatter of Skills and sub-agents:

```yaml
---
name: secure-operations
description: Operations with security checks
hooks:
  PreToolUse:
    - matcher: 'Bash'
      hooks:
        - type: command
          command: './scripts/security-check.sh'
---
```

These hooks are scoped to the component's lifecycle and removed when it terminates.

## Interactive Menu `/hooks`

Type `/hooks` in Claude Code to open the interactive manager. Each hook is prefixed by its source:

- `[User]`: `~/.claude/settings.json`
- `[Project]`: `.claude/settings.json`
- `[Local]`: `.claude/settings.local.json`
- `[Plugin]`: `hooks/hooks.json` from the plugin (read-only)

## Common Examples

### Block Destructive Commands

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/block-rm.sh"
          }
        ]
      }
    ]
  }
}
```

```bash
#!/bin/bash
# .claude/hooks/block-rm.sh
COMMAND=$(jq -r '.tool_input.command')

if echo "$COMMAND" | grep -q 'rm -rf'; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "Destructive command blocked par hook"
    }
  }'
else
  exit 0
fi
```

### Linter After File Write

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/check-style.sh"
          }
        ]
      }
    ]
  }
}
```

### HTTP Hook with Authentication

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "http",
            "url": "http://localhost:8080/hooks/pre-tool-use",
            "timeout": 30,
            "headers": {
              "Authorization": "Bearer $MY_TOKEN"
            },
            "allowedEnvVars": ["MY_TOKEN"]
          }
        ]
      }
    ]
  }
}
```

### Prompt Hook (LLM Evaluation)

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Is this command safe to execute? Data: $ARGUMENTS",
            "timeout": 15
          }
        ]
      }
    ]
  }
}
```

### SessionStart Hook for Setup

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "npm install && npm run build",
            "timeout": 120,
            "statusMessage": "Installing dependencies..."
          }
        ]
      }
    ]
  }
}
```

## Disabling Hooks

- **Remove**: edit the JSON or use the `/hooks` menu
- **Temporarily disable**: `"disableAllHooks": true` in the settings file
- Managed hooks (admin) can only be disabled by `disableAllHooks` at the managed level

**Important**: direct modifications to hooks do not take effect immediately. Claude Code captures a snapshot at startup. External changes require a review in `/hooks`.

## Sources

- [Hooks reference — Claude Code Docs](https://code.claude.com/docs/en/hooks)
- [Automate workflows with hooks — Claude Code Docs](https://code.claude.com/docs/en/hooks-guide)
