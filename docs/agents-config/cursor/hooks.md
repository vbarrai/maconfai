> **maconfai support: Supported** — Hooks can be installed via `hooks.json` in the source repository.

# Cursor — Hooks Guide

> Official source: [cursor.com/docs/hooks](https://cursor.com/docs/hooks)

## What is a Hook?

Hooks let you observe, control, and extend the agent loop using custom scripts. Hook processes communicate via JSON over stdio and run before or after defined agent loop stages. They enable post-edit formatting, event analytics, PII/secrets detection, operation gating, subagent control, and session context injection.

## Platform Support

| Interface                           | Available Hooks                                                                         |
| :---------------------------------- | :-------------------------------------------------------------------------------------- |
| **Cursor Agent** (Cmd+K)            | `sessionStart`, `preToolUse`, `beforeShellExecution`, `afterFileEdit`, `stop`, and more |
| **Cursor Tab** (inline completions) | `beforeTabFileRead`, `afterTabFileEdit` (separate policies for Tab vs Agent)            |

## Configuration

### File Locations

Priority from highest to lowest:

| Location                                                                                                                                                         | Scope                                | Shareable         |
| :--------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------- | :---------------- |
| Enterprise (MDM-managed): macOS `/Library/Application Support/Cursor/hooks.json`, Linux/WSL `/etc/cursor/hooks.json`, Windows `C:\ProgramData\Cursor\hooks.json` | System-wide                          | Yes (admin)       |
| Team (cloud-distributed, web dashboard)                                                                                                                          | Enterprise only                      | Yes (admin)       |
| `.cursor/hooks.json`                                                                                                                                             | Project (runs in trusted workspaces) | Yes (committable) |
| `~/.cursor/hooks.json`                                                                                                                                           | User (global)                        | No                |

Plugin hooks come after all of these. **Merge rules**: all matching hooks run; `deny` beats `ask`, and `ask` beats `allow`; `user_message` and `agent_message` are concatenated; for other fields such as `followup_message` the last response wins, so lower-priority sources override higher-priority ones.

### Configuration Format

```json
{
  "version": 1,
  "hooks": {
    "hookName": [
      {
        "command": "./path/to/script.sh",
        "timeout": 30,
        "matcher": "pattern",
        "failClosed": false
      }
    ]
  }
}
```

**Working directory**: Project hooks run from the project root (use `.cursor/hooks/script.sh`). User hooks run from `~/.cursor/` (use `./hooks/script.sh`). Enterprise hooks run from the enterprise config directory, Team hooks from the managed hooks directory, plugin hooks from the plugin install directory (`CURSOR_PLUGIN_ROOT`; `stop` and `subagentStop` plugin hooks run from the workspace root).

### Configuration Options

| Option       | Type                      | Default          | Description                                                                                    |
| :----------- | :------------------------ | :--------------- | :--------------------------------------------------------------------------------------------- |
| `command`    | string                    | required         | Script path or shell command                                                                   |
| `type`       | `"command"` \| `"prompt"` | `"command"`      | Execution type                                                                                 |
| `timeout`    | number                    | platform default | Seconds until timeout                                                                          |
| `loop_limit` | number \| null            | 5                | Auto-follow-up iteration cap                                                                   |
| `failClosed` | boolean                   | false            | Block on hook failure (vs. fail-open)                                                          |
| `matcher`    | string/regex              | —                | Filter criteria; empty or `"*"` matches everything                                             |
| `model`      | string                    | —                | Optional model override (prompt hooks)                                                         |
| `prompt`     | string                    | —                | Prompt text for `type: "prompt"`; supports `$ARGUMENTS` (the input JSON is appended if absent) |

## Handler Types

### Command (default)

Shell scripts receiving JSON via stdin, returning JSON via stdout.

Exit code behavior:

| Code      | Meaning                        |
| :-------- | :----------------------------- |
| **0**     | Success — use JSON output      |
| **2**     | Block action (deny permission) |
| **Other** | Fail-open (action proceeds)    |

For permission hooks (`beforeShellExecution`, `beforeMCPExecution`, `beforeReadFile`, `beforeTabFileRead`, `subagentStart`, `preToolUse`), invalid JSON or a schema mismatch on exit 0 blocks the action. With `failClosed: true`, crashes, timeouts, non-zero exits and empty output also block. `command` hooks are supported in cloud agents; `prompt` hooks are not.

### Prompt (`type: "prompt"`)

LLM-evaluated natural language conditions for policy enforcement without custom scripts:

```json
{
  "type": "prompt",
  "prompt": "Does this command look safe?",
  "timeout": 10,
  "model": "optional-override"
}
```

Returns `{ ok: boolean, reason?: string }`.

> **Note**: In `type: "prompt"` hooks, the literal `$ARGUMENTS` placeholder inside the `prompt` field is auto-replaced with the JSON hook input at evaluation time.

## Hook Events Reference

### Session Lifecycle

| Event          | When it triggers           | Can block?           |
| :------------- | :------------------------- | :------------------- |
| `sessionStart` | When a conversation begins | No (fire-and-forget) |
| `sessionEnd`   | When a conversation ends   | No (fire-and-forget) |

`sessionStart` input adds `session_id`, `is_background_agent` and (optionally) `composer_mode`; `sessionEnd` adds `session_id`, `reason`, `duration_ms`, `is_background_agent`, `final_status` and (optionally) `error_message`. `sessionStart` can inject environment variables and context (`env`, `additional_context`); its schema also accepts `continue` and `user_message`, but they are not enforced. `sessionEnd` receives reason (`completed`/`aborted`/`error`/`window_close`/`user_close`) and duration metrics.

### App Lifecycle

| Event           | When it triggers       | Can block?           |
| :-------------- | :--------------------- | :------------------- |
| `workspaceOpen` | When a workspace opens | No (fire-and-forget) |

App-lifecycle hooks (such as `workspaceOpen`) omit session-specific fields (`conversation_id`, `generation_id`, `model`, `session_id`, `transcript_path`) from the universal input. `workspaceOpen` input is `hook_event_name`, `cursor_version`, `workspace_roots`, `user_email`.

### Tool Execution

| Event                | When it triggers                                          | Can block? |
| :------------------- | :-------------------------------------------------------- | :--------- |
| `preToolUse`         | Before any tool execution (Shell, Read, Write, MCP, Task) | Yes        |
| `postToolUse`        | After successful tool execution                           | No         |
| `postToolUseFailure` | When tool fails, times out, or is denied                  | No         |

`preToolUse` returns permission decision and optional modified input. `postToolUse` can update MCP tool output or inject additional context. `postToolUseFailure` receives `failure_type` (`error`/`timeout`/`permission_denied`).

### Shell & MCP Commands

| Event                  | When it triggers               | Can block? |
| :--------------------- | :----------------------------- | :--------- |
| `beforeShellExecution` | Before shell command execution | Yes        |
| `afterShellExecution`  | After shell command execution  | No         |
| `beforeMCPExecution`   | Before MCP tool execution      | Yes        |
| `afterMCPExecution`    | After MCP tool execution       | No         |

`beforeShellExecution` can allow/deny/ask permission. Set `failClosed: true` for security-critical gates (default is fail-open). `beforeShellExecution` input is `command`, `cwd`, `sandbox`. `afterShellExecution` receives command, full output, duration, and sandbox flag. `beforeMCPExecution` input is `tool_name`, `tool_input`, `mcp_server_name`, plus `mcp_server_url`/`url` (HTTP/SSE) or `command` (stdio); `afterMCPExecution` adds `result_json` and `duration`.

### File Operations

| Event               | When it triggers                             | Can block? |
| :------------------ | :------------------------------------------- | :--------- |
| `beforeReadFile`    | Before reading a file                        | Yes        |
| `afterFileEdit`     | After a file is edited                       | No         |
| `beforeTabFileRead` | Tab-specific file read (no attachments)      | Yes        |
| `afterTabFileEdit`  | Tab-specific post-edit (includes range info) | No         |

`beforeReadFile` input includes `file_path`, `content`, and `attachments`. `afterFileEdit` receives `file_path` and `edits` array with old/new strings.

### Subagent (Task Tool) Control

| Event           | When it triggers         | Can block? |
| :-------------- | :----------------------- | :--------- |
| `subagentStart` | Before subagent spawning | Yes        |
| `subagentStop`  | When subagent completes  | No         |

`subagentStart` input includes `subagent_id`, `subagent_type`, `task`, `parent_conversation_id`, `tool_call_id`, `subagent_model`, `is_parallel_worker`, and (optionally) `git_branch`. `subagentStop` can trigger auto-continue via `followup_message` and receives `subagent_type`, `status`, `task`, `description`, `summary`, `duration_ms`, `message_count`, `tool_call_count`, `loop_count`, `modified_files`, and `agent_transcript_path`.

### Prompt & Context

| Event                | When it triggers                         | Can block?         |
| :------------------- | :--------------------------------------- | :----------------- |
| `beforeSubmitPrompt` | After user sends, before backend request | Yes                |
| `preCompact`         | Before context window compaction         | No (observational) |

`preCompact` input includes `trigger`, `context_usage_percent`, `context_tokens`, `context_window_size`, `message_count`, `messages_to_compact`, and `is_first_compaction` (boolean).

### Agent Response Tracking

| Event                | When it triggers                        | Can block? |
| :------------------- | :-------------------------------------- | :--------- |
| `afterAgentResponse` | After agent completes assistant message | No         |
| `afterAgentThought`  | After thinking block completion         | No         |
| `stop`               | When agent loop ends                    | Yes        |

`stop` can auto-submit follow-up messages via `followup_message` for iterative flows. Receives `status` and `loop_count`.

## Matchers (Filters)

| Event                                             | What the matcher filters   | Examples                                                              |
| :------------------------------------------------ | :------------------------- | :-------------------------------------------------------------------- |
| `preToolUse`, `postToolUse`, `postToolUseFailure` | Tool type                  | `Shell`, `Read`, `Write`, `Grep`, `Delete`, `Task`, `MCP:<tool_name>` |
| `subagentStart`, `subagentStop`                   | Subagent type              | `generalPurpose`, `explore`, `shell`                                  |
| `beforeShellExecution`, `afterShellExecution`     | Shell command text (regex) | `curl\|wget\|nc`                                                      |
| `beforeReadFile`, `afterFileEdit`                 | Fixed value                | `Read`, `Write`                                                       |
| `beforeTabFileRead`, `afterTabFileEdit`           | Fixed value                | `TabRead`, `TabWrite`                                                 |
| `beforeSubmitPrompt`                              | Fixed value                | `UserPromptSubmit`                                                    |
| `stop`, `afterAgentResponse`, `afterAgentThought` | Fixed value                | `Stop`, `AgentResponse`, `AgentThought`                               |

No documented matcher for `sessionStart`, `sessionEnd`, `beforeMCPExecution`, `afterMCPExecution`, `preCompact`, `workspaceOpen`.

Example:

```json
{
  "command": "./approve.sh",
  "matcher": "curl|wget|nc"
}
```

## JSON Input/Output

### Universal Input Fields

Every hook receives:

```json
{
  "conversation_id": "stable-id",
  "generation_id": "changes-per-message",
  "model": "claude-sonnet-4-20250514",
  "model_id": "string (optional)",
  "model_params": "[{id, value}] (optional)",
  "hook_event_name": "hookName",
  "cursor_version": "1.7.2",
  "workspace_roots": ["/path"],
  "user_email": "user@example.com or null",
  "transcript_path": "/path or null"
}
```

### Permission Output Format

Blocking/allowing hooks return:

```json
{
  "permission": "allow",
  "user_message": "shown-in-client",
  "agent_message": "sent-to-agent"
}
```

`permission` options: `"allow"`, `"deny"`, `"ask"`. `"ask"` is only supported for `beforeShellExecution` and `beforeMCPExecution`; it is **not supported for `preToolUse`** (falls back to deny). `subagentStart` supports only `"allow"` or `"deny"`.

### Additional Output Fields

| Field                     | Hook                 | Description                                                                  |
| :------------------------ | :------------------- | :--------------------------------------------------------------------------- |
| `updated_input`           | `preToolUse`         | Modified tool input forwarded to the tool execution                          |
| `continue`                | `beforeSubmitPrompt` | Allow (`true`) or block (`false`) the prompt submission                      |
| `env`                     | `sessionStart`       | Environment variables injected into the session                              |
| `additional_context`      | `sessionStart`       | Extra context string appended to the session                                 |
| `updated_mcp_tool_output` | `postToolUse`        | Redacted/modified MCP tool output (for PII/secret stripping after execution) |
| `additional_context`      | `postToolUse`        | Extra context string injected after the tool result                          |
| `user_message`            | `preCompact`         | Message to show the user when compaction occurs                              |
| `pluginPaths`             | `workspaceOpen`      | Absolute paths to plugin directories to load for the current workspace       |

### Follow-Up Automation

`subagentStop` and `stop` hooks support:

```json
{
  "followup_message": "auto-submitted-text"
}
```

Subject to `loop_limit` (default 5).

## Environment Variables

| Variable                 | Description                               | Always Present |
| :----------------------- | :---------------------------------------- | :------------- |
| `CURSOR_PROJECT_DIR`     | Workspace root                            | Yes            |
| `CURSOR_VERSION`         | Cursor version                            | Yes            |
| `CURSOR_USER_EMAIL`      | Authenticated user email                  | If logged in   |
| `CURSOR_TRANSCRIPT_PATH` | Conversation transcript path              | If enabled     |
| `CURSOR_CODE_REMOTE`     | `"true"` in remote workspaces             | Remote only    |
| `CLAUDE_PROJECT_DIR`     | Alias (Claude Code compatibility)         | Yes            |
| `CURSOR_PLUGIN_ROOT`     | Install directory of the providing plugin | Plugin hooks   |

Session-scoped variables from `sessionStart` propagate to subsequent hook executions.

## Common Examples

### Audit Hook

```bash
#!/bin/bash
json_input=$(cat)
timestamp=$(date '+%Y-%m-%d %H:%M:%S')
mkdir -p /tmp
echo "[$timestamp] $json_input" >> /tmp/agent-audit.log
exit 0
```

### Git Command Blocker

Block raw git commands and redirect to GitHub CLI:

```json
{
  "version": 1,
  "hooks": {
    "beforeShellExecution": [
      {
        "command": ".cursor/hooks/git-guard.sh",
        "matcher": "^git "
      }
    ]
  }
}
```

The script returns `permission: "deny"` for git commands, `permission: "ask"` for gh commands, and allows others.

### Post-Edit Formatter

```json
{
  "version": 1,
  "hooks": {
    "afterFileEdit": [
      {
        "command": ".cursor/hooks/format.sh",
        "matcher": "Write"
      }
    ]
  }
}
```

## Distribution

| Method                 | Location                                                                                                | Notes                                          |
| :--------------------- | :------------------------------------------------------------------------------------------------------ | :--------------------------------------------- |
| **Project**            | `.cursor/hooks.json`                                                                                    | Auto-loads in trusted workspaces               |
| **User**               | `~/.cursor/hooks.json`                                                                                  | Personal hooks                                 |
| **MDM**                | macOS: `/Library/Application Support/Cursor/`, Linux: `/etc/cursor/`, Windows: `C:\ProgramData\Cursor\` | System-wide                                    |
| **Cloud** (Enterprise) | Web dashboard                                                                                           | Auto-syncs every 30 min, supports OS targeting |

## Cloud Agent Support

The following hooks are **not** supported in cloud/remote agent environments: `sessionStart`, `sessionEnd`, `beforeSubmitPrompt`, `beforeTabFileRead`, `afterTabFileEdit`, `workspaceOpen`, `beforeMCPExecution`, `afterMCPExecution`, `afterAgentResponse`, `afterAgentThought`, and `stop`. All other hooks work in both local and cloud modes.

Cloud agents support **command-based hooks only** — prompt-based (`type: "prompt"`) hooks are not supported in cloud environments.

## Debugging

- Open the **Hooks** tab in Cursor Settings to view configured hooks, execution history, and errors
- Check the **Hooks** output channel for stderr output
- Cursor auto-reloads `hooks.json` on save (restart if needed)

## Comparison with Claude Code

| Aspect                    | Cursor                                              | Claude Code                                      |
| :------------------------ | :-------------------------------------------------- | :----------------------------------------------- |
| **Config file**           | `.cursor/hooks.json` (dedicated)                    | `settings.json` (shared)                         |
| **Config format**         | `version` + `hooks` object                          | `hooks` in settings                              |
| **Handler types**         | Command, Prompt                                     | Command, HTTP, Prompt, Agent                     |
| **Tab-specific hooks**    | Yes (`beforeTabFileRead`, `afterTabFileEdit`)       | No                                               |
| **File operation hooks**  | Yes (`beforeReadFile`, `afterFileEdit`)             | No (use `PreToolUse`/`PostToolUse`)              |
| **Shell-specific hooks**  | Yes (`beforeShellExecution`, `afterShellExecution`) | No (use `PreToolUse`/`PostToolUse` with matcher) |
| **MCP-specific hooks**    | Yes (`beforeMCPExecution`, `afterMCPExecution`)     | No (use `PreToolUse` with `mcp__*` matcher)      |
| **Prompt hooks**          | Yes (returns `ok`/`reason`)                         | Yes (returns `permissionDecision`)               |
| **HTTP hooks**            | No                                                  | Yes                                              |
| **Agent hooks**           | No                                                  | Yes (sub-agent with tools)                       |
| **Follow-up automation**  | Yes (`followup_message` + `loop_limit`)             | No                                               |
| **Fail-closed option**    | Yes (`failClosed: true`)                            | No (exit code 2 blocks)                          |
| **Environment variables** | `CURSOR_PROJECT_DIR`, `CURSOR_VERSION`, etc.        | `$CLAUDE_PROJECT_DIR`, `${CLAUDE_PLUGIN_ROOT}`   |
| **Claude compat**         | Yes (`CLAUDE_PROJECT_DIR` alias)                    | —                                                |

## Interop

Cursor supports loading hooks from third-party tools, including Claude Code. Existing Claude Code hook configurations can be reused/loaded by Cursor for easier migration and shared tooling across agents.

## Sources

- [Hooks — Cursor Docs](https://cursor.com/docs/hooks)
