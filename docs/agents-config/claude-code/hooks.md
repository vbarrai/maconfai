> **maconfai support: Supported** — Hooks can be installed via `hooks.json` in the source repository.

# Claude Code — Hooks Guide

> Official source: [code.claude.com/docs/en/hooks](https://code.claude.com/docs/en/hooks)

## What is a Hook?

Hooks are shell commands, HTTP endpoints, or LLM prompts defined by the user that run automatically at specific points in the Claude Code lifecycle. They allow you to automate workflows, validate actions, block dangerous commands, or add context.

## Hook Lifecycle

| Event                 | When it triggers                                                    | Can block?                       |
| :-------------------- | :------------------------------------------------------------------ | :------------------------------- |
| `Setup`               | Fires for `--init-only`, or `--init` / `--maintenance` in `-p` mode | No                               |
| `SessionStart`        | At startup or when resuming a session                               | No                               |
| `UserPromptSubmit`    | When a prompt is submitted, before processing by Claude             | Yes                              |
| `UserPromptExpansion` | When a slash command is expanded into the prompt                    | Yes                              |
| `PreToolUse`          | Before a tool executes. Can block it                                | Yes                              |
| `PermissionRequest`   | When a permission dialog appears                                    | Yes (via `decision`, not exit 2) |
| `PermissionDenied`    | When auto mode denies a tool call (supports `retry: true`)          | No                               |
| `PostToolUse`         | After a tool has succeeded                                          | No                               |
| `PostToolUseFailure`  | After a tool has failed                                             | No                               |
| `PostToolBatch`       | After a parallel batch of tool calls completes                      | Yes                              |
| `Notification`        | When Claude Code sends a notification                               | No                               |
| `Elicitation`         | When a tool requests user input (MCP elicitation)                   | Yes                              |
| `ElicitationResult`   | After an elicitation dialog resolves                                | Yes                              |
| `SubagentStart`       | When a sub-agent is launched                                        | No                               |
| `SubagentStop`        | When a sub-agent finishes                                           | Yes                              |
| `Stop`                | When Claude finishes responding                                     | Yes                              |
| `StopFailure`         | When the main loop stops due to an error                            | No                               |
| `TaskCreated`         | When a task is created                                              | Yes                              |
| `TeammateIdle`        | When a team teammate is about to go idle                            | Yes                              |
| `TaskCompleted`       | When a task is marked as completed                                  | Yes                              |
| `InstructionsLoaded`  | When a CLAUDE.md or `.claude/rules/*.md` is loaded                  | No                               |
| `ConfigChange`        | When a configuration file changes during a session                  | Yes                              |
| `CwdChanged`          | When the current working directory changes                          | No                               |
| `DirectoryAdded`      | When a directory is added via `/add-dir` or `register_repo_root`    | No                               |
| `FileChanged`         | When a tracked file changes externally                              | No                               |
| `WorktreeCreate`      | When a worktree is created via `--worktree`                         | Yes                              |
| `WorktreeRemove`      | When a worktree is removed                                          | Yes                              |
| `PreCompact`          | Before context compaction                                           | Yes                              |
| `PostCompact`         | After context compaction                                            | No                               |
| `PreModelSwitch`      | Before a requested model switch is applied                          | Yes                              |
| `PostModelSwitch`     | After the session's model changes                                   | No                               |
| `MessageDisplay`      | When an assistant message is displayed to the user                  | No                               |
| `SessionEnd`          | When a session ends                                                 | No                               |

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

| Field           | Required | Description                                                                                                                                                                                                   |
| :-------------- | :------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `type`          | Yes      | `"command"`                                                                                                                                                                                                   |
| `command`       | Yes      | Shell command to execute (shell form when `args` is omitted), or the executable when `args` is set                                                                                                            |
| `args`          | No       | Argument list — enables exec form (no shell), vs shell form when only `command` is set                                                                                                                        |
| `timeout`       | No       | Seconds before cancellation (default: 600; lowered to 30 on `UserPromptSubmit`, `PreModelSwitch`, `PostModelSwitch`; 10 on `MessageDisplay`; `SessionEnd` hooks share a 1.5-second budget)                    |
| `async`         | No       | If `true`, runs in the background without blocking                                                                                                                                                            |
| `asyncRewake`   | No       | Runs in the background; exit code 2 wakes Claude, with stderr (or stdout if stderr is empty) shown as a system reminder                                                                                       |
| `shell`         | No       | `bash` (default; `powershell` on Windows without Git Bash) or `powershell`. Ignored when `args` is set                                                                                                        |
| `onFailure`     | No       | `"continue"` or `"block"`: with `"block"`, a non-blocking error blocks the action (v2.1.295+)                                                                                                                 |
| `statusMessage` | No       | Message displayed during execution                                                                                                                                                                            |
| `once`          | No       | If `true`, removed after its first successful run. Honored only in skill frontmatter                                                                                                                          |
| `if`            | No       | One permission rule (e.g. `"Bash(git *)"`, `"Edit(*.ts)"`). Evaluated only on `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `PermissionRequest`, `PermissionDenied`; on other events the hook never runs |

### HTTP (`type: "http"`)

Sends the JSON input as a POST to a URL.

| Field            | Required | Description                                                                                                                                  |
| :--------------- | :------- | :------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`           | Yes      | `"http"`                                                                                                                                     |
| `url`            | Yes      | Endpoint URL                                                                                                                                 |
| `timeout`        | No       | Seconds before cancellation (default: 600; lowered to 30 on `UserPromptSubmit`, `PreModelSwitch`, `PostModelSwitch`; 10 on `MessageDisplay`) |
| `headers`        | No       | HTTP headers (supports `$VAR_NAME` and `${VAR_NAME}` for env variable interpolation)                                                         |
| `allowedEnvVars` | No       | List of env var names that are allowed to be interpolated into `headers`                                                                     |
| `onFailure`      | No       | `"continue"` or `"block"` (v2.1.295+)                                                                                                        |
| `statusMessage`  | No       | Message displayed during execution                                                                                                           |

### Prompt (`type: "prompt"`)

Sends a prompt to a Claude model for single-turn evaluation.

| Field     | Required | Description                                                                      |
| :-------- | :------- | :------------------------------------------------------------------------------- |
| `type`    | Yes      | `"prompt"`                                                                       |
| `prompt`  | Yes      | Prompt text. `$ARGUMENTS` = hook JSON input (`\$` escapes a literal dollar sign) |
| `model`   | No       | Model to use (default: the background-functionality model)                       |
| `timeout` | No       | Seconds before cancellation (default: 30)                                        |

### MCP Tool (`type: "mcp_tool"`)

Invokes a tool exposed by a configured MCP server.

| Field           | Required | Description                                                                                                                                  |
| :-------------- | :------- | :------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`          | Yes      | `"mcp_tool"`                                                                                                                                 |
| `server`        | Yes      | MCP server name (plugin servers: `plugin:<plugin-name>:<server-name>`)                                                                       |
| `tool`          | Yes      | Tool name on that server                                                                                                                     |
| `input`         | No       | Input object passed to the tool; string values support `${path}` substitution from the hook input, e.g. `"${tool_input.file_path}"`          |
| `onFailure`     | No       | `"continue"` or `"block"` (v2.1.328+)                                                                                                        |
| `statusMessage` | No       | Message displayed during execution                                                                                                           |
| `timeout`       | No       | Seconds before cancellation (default: 600; lowered to 30 on `UserPromptSubmit`, `PreModelSwitch`, `PostModelSwitch`; 10 on `MessageDisplay`) |
| `once`          | No       | If `true`, removed after its first successful run. Honored only in skill frontmatter                                                         |

### Agent (`type: "agent"`)

Launches a sub-agent with tool access (Read, Grep, Glob) to verify conditions. Agent hooks are experimental.

| Field     | Required | Description                               |
| :-------- | :------- | :---------------------------------------- |
| `type`    | Yes      | `"agent"`                                 |
| `prompt`  | Yes      | Sub-agent prompt                          |
| `model`   | No       | Model to use                              |
| `timeout` | No       | Seconds before cancellation (default: 60) |

## Matchers (Filters)

The `matcher` field is a regex that filters when the hook triggers. Use `"*"`, `""`, or omit `matcher` to match everything. Events without matcher support (`UserPromptSubmit`, `PostToolBatch`, `MessageDisplay`, `TaskCreated`, `TaskCompleted`, `Stop`, `TeammateIdle`, `CwdChanged`, `WorktreeCreate`, `WorktreeRemove`) silently ignore a `matcher` field.

| Event                                                                                      | What the matcher filters    | Examples                                                                                                                                                                                                                                                                                                                      |
| :----------------------------------------------------------------------------------------- | :-------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `PermissionRequest`, `PermissionDenied` | Tool name                   | `Bash`, `Edit\|Write`, `mcp__.*`                                                                                                                                                                                                                                                                                              |
| `SessionStart`                                                                             | How the session started     | `startup`, `resume`, `clear`, `compact`, `fork`                                                                                                                                                                                                                                                                               |
| `SessionEnd`                                                                               | Why the session ended       | `clear`, `resume`, `logout`, `prompt_input_exit`, `other`                                                                                                                                                                                                                                                                     |
| `Notification`                                                                             | Notification type           | `permission_prompt`, `idle_prompt`, `auth_success`, `auth_storage_failure`, `elicitation_dialog`, `elicitation_url_dialog`, `elicitation_complete`, `elicitation_response`, `agent_needs_input`, `agent_completed`, `quota_auto_resume_fired`, `quota_auto_resume_stale`, `quota_auto_resume_disabled`, `plugin_notification` |
| `Setup`                                                                                    | Run mode                    | `init`, `maintenance`                                                                                                                                                                                                                                                                                                         |
| `UserPromptExpansion`                                                                      | Command name                | the expanded command name                                                                                                                                                                                                                                                                                                     |
| `Elicitation`, `ElicitationResult`                                                         | MCP server name             | `memory`                                                                                                                                                                                                                                                                                                                      |
| `DirectoryAdded`                                                                           | How the directory was added | `slash_command`, `register_repo_root`                                                                                                                                                                                                                                                                                         |
| `PreModelSwitch`, `PostModelSwitch`                                                        | Canonical model name        | `claude-opus-5`, `.*opus.*`                                                                                                                                                                                                                                                                                                   |
| `SubagentStart`, `SubagentStop`                                                            | Agent type                  | `general-purpose`, `Explore`, `Plan`, custom agent names                                                                                                                                                                                                                                                                      |
| `ConfigChange`                                                                             | Config source               | `user_settings`, `project_settings`, `local_settings`, `policy_settings`, `skills`                                                                                                                                                                                                                                            |
| `InstructionsLoaded`                                                                       | Load trigger                | `session_start`, `nested_traversal`, `path_glob_match`, `include`, `compact`                                                                                                                                                                                                                                                  |
| `PreCompact`, `PostCompact`                                                                | Trigger                     | `manual`, `auto`                                                                                                                                                                                                                                                                                                              |
| `StopFailure`                                                                              | Failure reason              | `rate_limit`, `authentication_failed`, `oauth_org_not_allowed`, `account_on_hold`, `billing_error`, `invalid_request`, `model_not_found`, `server_error`, `max_output_tokens`, `cloud_credential_error`, `unknown`                                                                                                            |
| `FileChanged`                                                                              | Watched filenames           | Literal filename watch list — **not** a regex or glob                                                                                                                                                                                                                                                                         |

### Matcher Semantics

A matcher containing only letters, digits, `_`, `-`, spaces, `,`, or `|` is matched as an exact string (or a `|`- or `,`-separated list of exact strings). Any other character turns it into an unanchored JavaScript regular expression (e.g. `^Notebook`). `FileChanged` and `StopFailure` accept only letters, digits, `_`, and `|`: a hyphen, space, or comma pushes them onto the regex path.

> **Caution (fail-open)**: patterns with arguments (e.g. `Bash(git push *)`) fail open — they match every tool call, not just the specified argument pattern. Use the `if` field for argument-level filtering instead.

### Matcher for MCP Tools

MCP tools follow the pattern `mcp__<server>__<tool>` (plugin servers: `mcp__plugin_<plugin-name>_<server-name>__<tool>`). The `.*` is required to match a whole server:

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
| `prompt_id`       | Identifier of the current prompt                                                          |
| `scratchpad_dir`  | Session scratchpad directory                                                              |
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

| Code      | Meaning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| :-------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **0**     | Success. Claude Code parses stdout for optional JSON                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **2**     | Blocks the action for the events that support blocking (`PreToolUse`, `UserPromptSubmit`, `UserPromptExpansion`, `Stop`, `SubagentStop`, `TeammateIdle`, `TaskCreated`, `TaskCompleted`, `ConfigChange`, `PostToolBatch`, `PreCompact`, `PreModelSwitch`, `Elicitation`, `ElicitationResult`, `WorktreeCreate`, `WorktreeRemove`); exit 2 is not honored for `PermissionRequest` (deny through the `decision` object instead); for non-blocking events, exit 2 just shows stderr to the user |
| **Other** | Non-blocking error (the action proceeds unless the handler sets `onFailure: "block"`). stderr displayed in verbose mode                                                                                                                                                                                                                                                                                                                                                                      |

### JSON Output

On exit 0, stdout JSON can control behavior:

| Field              | Default | Description                                                                                |
| :----------------- | :------ | :----------------------------------------------------------------------------------------- |
| `continue`         | `true`  | If `false`, Claude stops all processing                                                    |
| `stopReason`       | —       | Message displayed when `continue: false`                                                   |
| `suppressOutput`   | `false` | No effect                                                                                  |
| `systemMessage`    | —       | Warning message displayed to the user                                                      |
| `decision`         | —       | `"block"` to block the action (certain events)                                             |
| `reason`           | —       | Reason for blocking                                                                        |
| `terminalSequence` | —       | Escape sequence Claude Code emits: only OSC `0`/`1`/`2`/`9`/`99`/`777` and BEL are allowed |

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

- `PostToolUse`: `decision: "block"` + `reason`, `additionalContext`, `classifierContext` (note for the auto-mode classifier, v2.1.236+), `updatedToolOutput` (replaces the tool output Claude sees; works for built-in and MCP tools, must match the tool's output shape; `updatedMCPToolOutput` is MCP-only and superseded).
- `UserPromptSubmit`: `sessionTitle`, `additionalContext`.
- `SessionStart`: `watchPaths` (array of paths to watch for `FileChanged` events), `reloadSkills` (if `true`, triggers a skills reload), `initialUserMessage` (first user message in non-interactive `-p` mode), `sessionTitle` (like `/rename`; applies for `startup`, `resume`, `fork`). `PostModelSwitch`: `additionalContext`.
- `PermissionDenied`: `retry: true` adds a message telling the model it may retry the tool call (the denial itself is not reversed); ignored when the classifier produced no verdict.
- `PermissionRequest`: `decision` object with `behavior` (`allow | deny`), and for `allow`: `updatedInput` (replaces the whole input object) and `updatedPermissions` (permission update entries to apply, e.g. an allow rule or a session permission-mode change); for `deny`: `message` (why Claude was denied) and `interrupt` (if `true`, stops Claude). Exit code 2 is ignored for this event.
- `Elicitation` / `ElicitationResult`: `action` (`accept | decline | cancel`) and `content`.
- `WorktreeCreate`: returns the worktree path (stdout or `worktreePath`).

### Output Caps, Dedup, and HTTP Semantics

- **Output cap**: hook stdout/stderr over 10,000 chars is truncated; the full payload is saved to a file with a preview.
- **Additional-context cap**: `additionalContext`, `systemMessage`, `initialUserMessage`, and plain stdout are each capped at 10,000 characters; larger output is saved to a file and replaced by a path and a 2,000-character preview.
- **Deduplication**: identical handler definitions registered multiple times are executed once per event. Command hooks dedupe by `command+args`; HTTP hooks dedupe by `url`.
- **HTTP hooks**: non-2xx responses are non-blocking. To block, return 2xx with `decision: "block"` or an appropriate `hookSpecificOutput`.

## Environment Variables

| Variable                         | Description                                                                                                                           |
| :------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------ |
| `$CLAUDE_PROJECT_DIR`            | Project root                                                                                                                          |
| `${CLAUDE_PLUGIN_ROOT}`          | Plugin root                                                                                                                           |
| `${CLAUDE_PLUGIN_DATA}`          | Plugin-scoped data directory                                                                                                          |
| `$CLAUDE_CODE_REMOTE`            | `"true"` in a remote web environment                                                                                                  |
| `$CLAUDE_ENV_FILE`               | Path to a file available in `SessionStart`, `CwdChanged`, `FileChanged` where hooks can persist env vars for subsequent Bash commands |
| `$CLAUDE_EFFORT`                 | Current reasoning effort level (`low`, `medium`, `high`, `xhigh`, `max`)                                                              |
| `$CLAUDE_PLUGIN_OPTION_<KEY>`    | Value of a plugin user-config option (e.g. `CLAUDE_PLUGIN_OPTION_WEBHOOK_URL`)                                                        |
| `$CLAUDE_CODE_BRIDGE_SESSION_ID` | Remote Control session ID while connected (v2.1.199+)                                                                                 |
| `$CLAUDE_CODE_GIT_BASH_PATH`     | Git Bash location if Claude Code does not find it on Windows                                                                          |

- Hooks inherit the parent environment, except `OTEL_*` exporter variables. There is no `$CLAUDE_MODEL`.

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

Subagent hooks run only while that subagent is running and are removed when it finishes (a `Stop` hook is converted to `SubagentStop`). Skill hooks do not run before the skill is invoked; they are removed when you exit or leave the conversation with a command such as `/clear` or `/resume` (use `once` to remove one sooner).

## Interactive Menu `/hooks`

Type `/hooks` in Claude Code to open a read-only browser for your configured hooks. Each hook is prefixed by its source:

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

- **Remove**: delete its entry from the settings file that defines it
- **Temporarily disable**: `"disableAllHooks": true` in the settings file
- Managed hooks (admin) can only be disabled by `disableAllHooks` at the managed level
- Managed settings can restrict hooks with `allowManagedHooksOnly` (blocks user, project, local and plugin hooks), `allowedHttpHookUrls` and `httpHookAllowedEnvVars` (allowlists for HTTP hook URLs and header env interpolation).

Direct edits to hooks in settings files are normally picked up automatically by the file watcher.

## Sources

- [Hooks reference — Claude Code Docs](https://code.claude.com/docs/en/hooks)
- [Automate workflows with hooks — Claude Code Docs](https://code.claude.com/docs/en/hooks-guide)
