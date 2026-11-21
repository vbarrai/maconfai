> **maconfai support: Supported** — maconfai installs Codex hooks from a source `hooks.json` (root or `hooks/<name>/hooks.json`) under the `codex` key into `.codex/hooks.json`. Codex hooks share the same shape as Claude Code hooks (`{ "hooks": { "<Event>": [ { "matcher", "hooks": [...] } ] } }`), written without the Cursor-style `version` wrapper.

# OpenAI Codex — Hooks Guide

> Official source: [learn.chatgpt.com/docs/hooks](https://learn.chatgpt.com/docs/hooks) (moved from `developers.openai.com/codex/hooks`, which now redirects there; secondary: [github.com/openai/codex](https://github.com/openai/codex))

## Overview

Codex supports a hooks system aligned with Claude Code's hooks: lifecycle events can trigger user-defined commands, with structured stdin payloads and structured outputs that can influence agent behavior.

## Lifecycle Events

| Event               | Description                                                           | Matcher filters                                           |
| :------------------ | :-------------------------------------------------------------------- | :-------------------------------------------------------- |
| `SessionStart`      | Fires when a Codex session begins                                     | `source`: `startup`, `resume`, `clear`, `compact`, `fork` |
| `PreToolUse`        | Fires before a tool call is executed                                  | Tool name                                                 |
| `PermissionRequest` | Fires only when Codex needs approval                                  | Tool name                                                 |
| `PostToolUse`       | Fires after a tool call completes                                     | Tool name                                                 |
| `UserPromptSubmit`  | Fires when the user submits a prompt                                  | Not supported (`matcher` ignored)                         |
| `Stop`              | Fires when the session is about to stop                               | Not supported (`matcher` ignored)                         |
| `SubagentStart`     | Fires when a sub-agent is launched                                    | Agent type                                                |
| `SubagentStop`      | Fires when a sub-agent finishes                                       | Agent type                                                |
| `PreCompact`        | Fires before context compaction                                       | `trigger`: `manual`, `auto`                               |
| `PostCompact`       | Fires after context compaction                                        | `trigger`: `manual`, `auto`                               |
| `PreModelRequest`   | Runs per model request attempt (diagnostic only)                      | Not supported                                             |
| `PostModelRequest`  | Runs per model request attempt (diagnostic only)                      | Not supported                                             |
| `Interrupt`         | Fires on interrupt (main thread only; cannot prevent it)              | Not supported                                             |
| `SessionEnd`        | Fires at session end (main thread only; advisory, runs synchronously) | `reason` (currently only `other`)                         |

Omitting `matcher`, or using `"*"` or `""`, matches every occurrence. For `apply_patch`, `matcher` can also use `Edit` or `Write`. Matching hooks from all sources run; command hooks for the same event start concurrently.

## Configuration Locations

Hooks can be defined in any of the following locations. Sources are combined (the page states no explicit precedence order); the same command registered twice can run twice. If one layer uses both `hooks.json` and `config.toml`, Codex loads both and warns at startup. Project hooks load only from trusted project layers (Codex checks `.codex` directories from the project root to the working directory).

| Location                                                                   | Scope                                                                                                                                                                                         |
| :------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/etc/codex/hooks.json` (Windows: `%ProgramData%\OpenAI\Codex\hooks.json`) | System-level                                                                                                                                                                                  |
| `$CODEX_HOME/hooks.json` (default `~/.codex/hooks.json`)                   | User-level                                                                                                                                                                                    |
| `~/.codex/config.toml` (inline `[hooks]` table)                            | User-level                                                                                                                                                                                    |
| `<repo>/.codex/hooks.json`                                                 | Project-level                                                                                                                                                                                 |
| `<repo>/.codex/config.toml` (inline `[hooks]`)                             | Project-level                                                                                                                                                                                 |
| `requirements.toml` (`[hooks]`, `managed_dir`, `windows_managed_dir`)      | Admin/policy. Set `allow_managed_hooks_only = true` to ignore user, project, session and plugin hooks. Pin `[features].hooks = true` to enforce managed hooks, or `false` to force hooks off. |
| `hooks/hooks.json` (plugin root)                                           | Default hooks path inside a plugin directory                                                                                                                                                  |
| `.codex-plugin/plugin.json`                                                | Plugin manifest — can override the default hooks path                                                                                                                                         |

## Feature flag and trust

- `[features]` → `hooks = true` (enabled by default) or `hooks = false`. `codex_hooks` is a deprecated alias that still works.
- Non-managed hooks must be reviewed and trusted before they run. Trust is tied to the hook's current hash: new or changed hooks are skipped until trusted. Use `/hooks` in the CLI to list sources, review, trust or disable hooks. A plugin update that changes a bundled script requires a new review.
- Managed hooks (system, MDM, cloud, `requirements.toml`) are trusted by policy and cannot be disabled by users.
- `--dangerously-bypass-hook-trust` runs enabled hooks for one invocation without persisted trust.

## Structure

Each event maps to a list of matcher groups; each matcher group has one or more handlers.

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "/path/to/script.sh",
            "timeout": 600,
            "statusMessage": "Validating bash command..."
          }
        ]
      }
    ]
  }
}
```

### Fields

| Field                    | Type    | Description                                                                                                  |
| :----------------------- | :------ | :----------------------------------------------------------------------------------------------------------- |
| `description`            | string  | Optional top-level metadata                                                                                  |
| `matcher`                | string  | Pattern to match against tool name or context                                                                |
| `type`                   | string  | Handler type: `"command"` or `"mcp_tool"` (`prompt` and `agent` handlers are parsed but skipped)             |
| `command`                | string  | Shell command to execute                                                                                     |
| `commandWindows`         | string  | Optional Windows-specific override command (also `command_windows` in TOML)                                  |
| `timeout`                | number  | Timeout in seconds (default: 600; `SessionEnd` and `Interrupt` default to 1, max 3)                          |
| `statusMessage`          | string  | Optional message displayed while the hook runs                                                               |
| `additionalContextLimit` | number  | Token cap for hook output added as context (default 2500; `0` passes the full text)                          |
| `async`                  | boolean | Runs in the background (up to 8 concurrently per session; cannot block or rewrite; cancelled at session end) |

`type: "mcp_tool"` handlers take `server` (required, must already be connected), `tool` (required), `input` (argument templates, default `{}`, supports `${field.nested}` placeholders), `timeout` (default 600) and `statusMessage`. They use existing connections only, run synchronously, request no approval, trigger no other hooks, and their errors do not block; `SessionEnd` does not support them.

## Hook stdin JSON

Hooks receive a JSON payload on stdin:

### Common Fields

| Field             | Description                                                                                                                                    |
| :---------------- | :--------------------------------------------------------------------------------------------------------------------------------------------- |
| `session_id`      | Current Codex session id                                                                                                                       |
| `transcript_path` | Path to the session transcript (string or null)                                                                                                |
| `cwd`             | Working directory                                                                                                                              |
| `hook_event_name` | Name of the lifecycle event                                                                                                                    |
| `turn_id`         | Identifier for the current conversation turn (turn-scoped events)                                                                              |
| `model`           | Active model slug                                                                                                                              |
| `permission_mode` | `"default"`, `"acceptEdits"`, `"plan"`, `"dontAsk"`, or `"bypassPermissions"` (on most events; not on `PreCompact`/`PostCompact`/`SessionEnd`) |

### Event-Specific Fields

| Event(s)                    | Additional fields                                                                                                  |
| :-------------------------- | :----------------------------------------------------------------------------------------------------------------- |
| `PreToolUse`                | `tool_name`, `tool_use_id`, `tool_input`                                                                           |
| `PermissionRequest`         | `tool_name`, `tool_input` (optional `tool_input.description`)                                                      |
| `PostToolUse`               | `tool_name`, `tool_use_id`, `tool_input`, `tool_response`                                                          |
| `UserPromptSubmit`          | `prompt`                                                                                                           |
| `PostModelRequest`          | `status` (`completed`, `failed`, `cancelled`), `error`, `token_usage`, plus `agent_id`/`agent_type` when available |
| `SessionEnd`                | `reason`                                                                                                           |
| `PreCompact`, `PostCompact` | `trigger`                                                                                                          |
| `SubagentStart`             | `agent_id`, `agent_type`, `turn_id`                                                                                |
| `SubagentStop`              | `agent_id`, `agent_type`, `turn_id`, `agent_transcript_path`                                                       |
| `SubagentStop`, `Stop`      | `stop_hook_active`, `last_assistant_message`                                                                       |
| `SessionStart`              | `source` — values: `"startup"`, `"resume"`, `"clear"`, `"compact"`, `"fork"`                                       |

## Hook outputs

A hook may emit a JSON object on stdout to influence Codex:

| Field            | Description                                                                                                      |
| :--------------- | :--------------------------------------------------------------------------------------------------------------- |
| `continue`       | Whether to continue the operation                                                                                |
| `stopReason`     | Reason to stop (if `continue` is false)                                                                          |
| `systemMessage`  | Message injected as a system message                                                                             |
| `suppressOutput` | If `true`, suppresses hook stdout from display (parsed; currently unimplemented)                                 |
| `decision`       | `"block"` (with `reason`) for `PostToolUse`, `UserPromptSubmit`, `SubagentStop`, `Stop`; legacy for `PreToolUse` |
| `reason`         | Human-readable rationale for the decision                                                                        |

These common fields apply to `SessionStart`, `PreCompact`, `PostCompact`, `UserPromptSubmit`, `SubagentStop`, `Stop` (`SubagentStart` honors only `systemMessage`). Per event:

- `SessionStart`: plain stdout becomes developer context; JSON `hookSpecificOutput.additionalContext`. `SubagentStart`: `systemMessage` and `hookSpecificOutput.additionalContext`.
- `PreToolUse`: `hookSpecificOutput.permissionDecision` (`"allow"` or `"deny"`), `permissionDecisionReason`, `additionalContext`, and `updatedInput` (only with `"allow"`; must include a string `command` for Bash and `apply_patch`). Unsupported (fails the hook): `"ask"`, legacy `"approve"`, `continue`, `stopReason`, `suppressOutput`.
- `PermissionRequest`: `hookSpecificOutput.decision.behavior` (`"allow"` or `"deny"`) and `message` on deny; any deny wins. Do not return `updatedInput`, `updatedPermissions` or `interrupt`.
- `PostToolUse`: `decision: "block"` + `reason`, `additionalContext`, `continue: false`, `stopReason`. `updatedMCPToolOutput` is unsupported.
- `SubagentStop` / `Stop`: `decision: "block"` + `reason` continues the work with a new prompt; plain text is invalid.
- `PreCompact` / `PostCompact`: `continue: false` stops compaction / stops after compaction. `PreModelRequest` / `PostModelRequest` are diagnostic only. `Interrupt` accepts an optional `systemMessage`.

Event-specific outputs use a nested `hookSpecificOutput` object:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Not allowed"
  }
}
```

**Exit code behavior**:

- **Exit 0 + JSON**: Codex parses and applies the JSON output.
- **Exit 0 + plain text**: becomes developer context for `SessionStart`; ignored for most other events (invalid for `Stop` and `SubagentStop`).
- **Exit 2 + stderr**: Blocks the action (reason on stderr) for `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `SubagentStop`, `Stop`.
- **Any other non-zero**: Hook failure; Codex continues normally (`SessionEnd` errors and timeouts are reported as hook failures).

Multiple hooks matching the same event run **concurrently**. Handlers with `async: true` are fire-and-forget (they do not block the agent loop).

## Limitations

- Output over about 2,500 tokens is saved to `<temp_dir>/hook_outputs/<session_id>/<uuid>.txt` with a preview.
- Hosted tools (such as `WebSearch`) are not covered; `write_stdin` does not re-run `PreToolUse`. Tool hooks are a guardrail, not a complete enforcement boundary.
- Cloud orchestration supports only global MCP hooks.
- Commands run with the session `cwd`; prefer git-root-based paths over relative `.codex/hooks/...` paths.

## Plugin Environment Variables

Hook processes inside a plugin receive these additional environment variables:

| Variable             | Description                      |
| :------------------- | :------------------------------- |
| `PLUGIN_ROOT`        | Absolute path to the plugin root |
| `PLUGIN_DATA`        | Plugin-scoped data directory     |
| `CLAUDE_PLUGIN_ROOT` | Alias for `PLUGIN_ROOT` (compat) |
| `CLAUDE_PLUGIN_DATA` | Alias for `PLUGIN_DATA` (compat) |

## Commit Attribution

Commit attribution is configured via the `command_attribution` field.

Per [openai/codex#11617](https://github.com/openai/codex/pull/11617) (merged 2026-02), the title and body of the PR describe two different mechanisms (prompt-based vs. `prepare-commit-msg` hook injected via `core.hooksPath`). The merged PR's "Summary of changes" explicitly keeps `command_attribution` config support (default Codex label, blank disables, custom label supported). The on-disk mechanism is out of scope for this doc until confirmed against `codex-rs` sources.

- **Default label**: standard attribution
- **Custom label**: custom label
- **Disable**: disable attribution

## Sources

- [Codex Hooks](https://learn.chatgpt.com/docs/hooks)
- [OpenAI Codex — GitHub](https://github.com/openai/codex)
