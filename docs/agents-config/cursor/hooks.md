> **maconfai support: Not supported** — Hooks are not managed by maconfai. Reference only.

# Cursor — Hooks Guide

> Official source: [cursor.com/docs/hooks](https://cursor.com/docs/hooks)

## What is a Hook?

Hooks let you observe, control, and extend the agent loop using custom scripts. Hook processes communicate via JSON over stdio and run before or after defined agent loop stages. They enable post-edit formatting, event analytics, PII/secrets detection, operation gating, subagent control, and session context injection.

## Platform Support

| Interface | Available Hooks |
|:----------|:---------------|
| **Cursor Agent** (Cmd+K) | `sessionStart`, `preToolUse`, `beforeShellExecution`, `afterFileEdit`, `stop`, and more |
| **Cursor Tab** (inline completions) | `beforeTabFileRead`, `afterTabFileEdit` (separate policies for Tab vs Agent) |

## Configuration

### File Locations

Priority from highest to lowest:

| Location | Scope | Shareable |
|:---------|:------|:----------|
| Enterprise (MDM-managed) | System-wide | Yes (admin) |
| Team (cloud-distributed) | Enterprise only | Yes (admin) |
| `.cursor/hooks.json` | Project | Yes (committable) |
| `~/.cursor/hooks.json` | User (global) | No |

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

**Working directory**: Project hooks run from the project root (use `.cursor/hooks/script.sh`). User hooks run from `~/.cursor/` (use `./hooks/script.sh`).

### Configuration Options

| Option | Type | Default | Description |
|:-------|:-----|:--------|:------------|
| `command` | string | required | Script path or shell command |
| `type` | `"command"` \| `"prompt"` | `"command"` | Execution type |
| `timeout` | number | platform default | Seconds until timeout |
| `loop_limit` | number \| null | 5 | Auto-follow-up iteration cap |
| `failClosed` | boolean | false | Block on hook failure (vs. fail-open) |
| `matcher` | string/regex | — | Filter criteria |

## Handler Types

### Command (default)

Shell scripts receiving JSON via stdin, returning JSON via stdout.

Exit code behavior:

| Code | Meaning |
|:-----|:--------|
| **0** | Success — use JSON output |
| **2** | Block action (deny permission) |
| **Other** | Fail-open (action proceeds) |

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

## Hook Events Reference

### Session Lifecycle

| Event | When it triggers | Can block? |
|:------|:----------------|:-----------|
| `sessionStart` | When a conversation begins | No (fire-and-forget) |
| `sessionEnd` | When a conversation ends | No (fire-and-forget) |

`sessionStart` can inject environment variables and context. `sessionEnd` receives reason (`completed`/`aborted`/`error`) and duration metrics.

### Tool Execution

| Event | When it triggers | Can block? |
|:------|:----------------|:-----------|
| `preToolUse` | Before any tool execution (Shell, Read, Write, MCP, Task) | Yes |
| `postToolUse` | After successful tool execution | No |
| `postToolUseFailure` | When tool fails, times out, or is denied | No |

`preToolUse` returns permission decision and optional modified input. `postToolUse` can update MCP tool output or inject additional context. `postToolUseFailure` receives `failure_type` (`error`/`timeout`/`permission_denied`).

### Shell & MCP Commands

| Event | When it triggers | Can block? |
|:------|:----------------|:-----------|
| `beforeShellExecution` | Before shell command execution | Yes |
| `afterShellExecution` | After shell command execution | No |
| `beforeMCPExecution` | Before MCP tool execution | Yes |
| `afterMCPExecution` | After MCP tool execution | No |

`beforeShellExecution` can allow/deny/ask permission. Set `failClosed: true` for security-critical gates (default is fail-open). `afterShellExecution` receives command, full output, duration, and sandbox flag.

### File Operations

| Event | When it triggers | Can block? |
|:------|:----------------|:-----------|
| `beforeReadFile` | Before reading a file | Yes |
| `afterFileEdit` | After a file is edited | No |
| `beforeTabFileRead` | Tab-specific file read (no attachments) | Yes |
| `afterTabFileEdit` | Tab-specific post-edit (includes range info) | No |

`beforeReadFile` input includes `file_path`, `content`, and `attachments`. `afterFileEdit` receives `file_path` and `edits` array with old/new strings.

### Subagent (Task Tool) Control

| Event | When it triggers | Can block? |
|:------|:----------------|:-----------|
| `subagentStart` | Before subagent spawning | Yes |
| `subagentStop` | When subagent completes | No |

`subagentStart` input includes `subagent_type`, task description, and parent conversation ID. `subagentStop` can trigger auto-continue via `followup_message` and receives status, duration, file modifications, and `loop_count`.

### Prompt & Context

| Event | When it triggers | Can block? |
|:------|:----------------|:-----------|
| `beforeSubmitPrompt` | After user sends, before backend request | Yes |
| `preCompact` | Before context window compaction | No (observational) |

### Agent Response Tracking

| Event | When it triggers | Can block? |
|:------|:----------------|:-----------|
| `afterAgentResponse` | After agent completes assistant message | No |
| `afterAgentThought` | After thinking block completion | No |
| `stop` | When agent loop ends | Yes |

`stop` can auto-submit follow-up messages via `followup_message` for iterative flows. Receives `status` and `loop_count`.

## Matchers (Filters)

| Event | What the matcher filters | Examples |
|:------|:------------------------|:---------|
| `preToolUse`, `postToolUse`, `postToolUseFailure` | Tool type | `Shell`, `Read`, `Write`, `Grep`, `Delete`, `Task`, `MCP:<tool_name>` |
| `subagentStart`, `subagentStop` | Subagent type | `generalPurpose`, `explore`, `shell` |
| `beforeShellExecution`, `afterShellExecution` | Shell command text (regex) | `curl\|wget\|nc` |
| `beforeReadFile`, `afterFileEdit` | Tool type | `TabRead`, `Read`, `TabWrite`, `Write` |
| `beforeSubmitPrompt` | Fixed value | `UserPromptSubmit` |
| `stop`, `afterAgentResponse`, `afterAgentThought` | Fixed value | `Stop`, `AgentResponse`, `AgentThought` |

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

`permission` options: `"allow"`, `"deny"`, `"ask"` (prompts user approval — some hooks don't support it and fall back to deny).

### Follow-Up Automation

`subagentStop` and `stop` hooks support:

```json
{
  "followup_message": "auto-submitted-text"
}
```

Subject to `loop_limit` (default 5).

## Environment Variables

| Variable | Description | Always Present |
|:---------|:------------|:---------------|
| `CURSOR_PROJECT_DIR` | Workspace root | Yes |
| `CURSOR_VERSION` | Cursor version | Yes |
| `CURSOR_USER_EMAIL` | Authenticated user email | If logged in |
| `CURSOR_TRANSCRIPT_PATH` | Conversation transcript path | If enabled |
| `CURSOR_CODE_REMOTE` | `"true"` in remote workspaces | Remote only |
| `CLAUDE_PROJECT_DIR` | Alias (Claude Code compatibility) | Yes |

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

| Method | Location | Notes |
|:-------|:---------|:------|
| **Project** | `.cursor/hooks.json` | Auto-loads in trusted workspaces |
| **User** | `~/.cursor/hooks.json` | Personal hooks |
| **MDM** | macOS: `/Library/Application Support/Cursor/`, Linux: `/etc/cursor/`, Windows: `C:\ProgramData\Cursor\` | System-wide |
| **Cloud** (Enterprise) | Web dashboard | Auto-syncs every 30 min, supports OS targeting |

## Debugging

- Open the **Hooks** tab in Cursor Settings to view configured hooks, execution history, and errors
- Check the **Hooks** output channel for stderr output
- Cursor auto-reloads `hooks.json` on save (restart if needed)

## Comparison with Claude Code

| Aspect | Cursor | Claude Code |
|:-------|:-------|:------------|
| **Config file** | `.cursor/hooks.json` (dedicated) | `settings.json` (shared) |
| **Config format** | `version` + `hooks` object | `hooks` in settings |
| **Handler types** | Command, Prompt | Command, HTTP, Prompt, Agent |
| **Tab-specific hooks** | Yes (`beforeTabFileRead`, `afterTabFileEdit`) | No |
| **File operation hooks** | Yes (`beforeReadFile`, `afterFileEdit`) | No (use `PreToolUse`/`PostToolUse`) |
| **Shell-specific hooks** | Yes (`beforeShellExecution`, `afterShellExecution`) | No (use `PreToolUse`/`PostToolUse` with matcher) |
| **MCP-specific hooks** | Yes (`beforeMCPExecution`, `afterMCPExecution`) | No (use `PreToolUse` with `mcp__*` matcher) |
| **Prompt hooks** | Yes (returns `ok`/`reason`) | Yes (returns `permissionDecision`) |
| **HTTP hooks** | No | Yes |
| **Agent hooks** | No | Yes (sub-agent with tools) |
| **Follow-up automation** | Yes (`followup_message` + `loop_limit`) | No |
| **Fail-closed option** | Yes (`failClosed: true`) | No (exit code 2 blocks) |
| **Environment variables** | `CURSOR_PROJECT_DIR`, `CURSOR_VERSION`, etc. | `$CLAUDE_PROJECT_DIR`, `${CLAUDE_PLUGIN_ROOT}` |
| **Claude compat** | Yes (`CLAUDE_PROJECT_DIR` alias) | — |

## Sources

- [Hooks — Cursor Docs](https://cursor.com/docs/hooks)
