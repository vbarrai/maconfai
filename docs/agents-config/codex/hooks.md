> **maconfai support: Supported** — maconfai installs Codex hooks from a source `hooks.json` (root or `hooks/<name>/hooks.json`) under the `codex` key into `.codex/hooks.json`. Codex hooks share the same shape as Claude Code hooks (`{ "hooks": { "<Event>": [ { "matcher", "hooks": [...] } ] } }`), written without the Cursor-style `version` wrapper.

# OpenAI Codex — Hooks Guide

> Official source: [developers.openai.com/codex/hooks](https://developers.openai.com/codex/hooks) (secondary: [github.com/openai/codex](https://github.com/openai/codex))

## Overview

Codex supports a hooks system aligned with Claude Code's hooks: lifecycle events can trigger user-defined commands, with structured stdin payloads and structured outputs that can influence agent behavior.

## Lifecycle Events

| Event               | Description                                       |
| :------------------ | :------------------------------------------------ |
| `SessionStart`      | Fires when a Codex session begins                 |
| `PreToolUse`        | Fires before a tool call is executed              |
| `PermissionRequest` | Fires when Codex needs to request user permission |
| `PostToolUse`       | Fires after a tool call completes                 |
| `UserPromptSubmit`  | Fires when the user submits a prompt              |
| `Stop`              | Fires when the session is about to stop           |
| `SubagentStart`     | Fires when a sub-agent is launched                |
| `SubagentStop`      | Fires when a sub-agent finishes                   |
| `PreCompact`        | Fires before context compaction                   |
| `PostCompact`       | Fires after context compaction                    |

## Configuration Locations

Hooks can be defined in any of the following locations (merged in precedence order):

| Location                                        | Scope                                                                                                                                  |
| :---------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------- |
| `~/.codex/hooks.json`                           | User-level                                                                                                                             |
| `~/.codex/config.toml` (inline `[hooks]` table) | User-level                                                                                                                             |
| `<repo>/.codex/hooks.json`                      | Project-level                                                                                                                          |
| `<repo>/.codex/config.toml` (inline `[hooks]`)  | Project-level                                                                                                                          |
| `requirements.toml`                             | Admin/policy. Set `allow_managed_hooks_only = true` to ignore lower-scope hooks. Set `[features].hooks = true` to force hooks enabled. |
| `hooks/hooks.json` (plugin root)                | Default hooks path inside a plugin directory                                                                                           |
| `.codex-plugin/plugin.json`                     | Plugin manifest — can override the default hooks path                                                                                  |

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

| Field            | Type   | Description                                                                 |
| :--------------- | :----- | :-------------------------------------------------------------------------- |
| `matcher`        | string | Pattern to match against tool name or context                               |
| `type`           | string | Handler type — currently only `"command"`                                   |
| `command`        | string | Shell command to execute                                                    |
| `commandWindows` | string | Optional Windows-specific override command (also `command_windows` in TOML) |
| `timeout`        | number | Timeout in seconds (default: 600)                                           |
| `statusMessage`  | string | Optional message displayed while the hook runs                              |

## Hook stdin JSON

Hooks receive a JSON payload on stdin:

### Common Fields

| Field             | Description                                                                   |
| :---------------- | :---------------------------------------------------------------------------- |
| `session_id`      | Current Codex session id                                                      |
| `transcript_path` | Path to the session transcript                                                |
| `cwd`             | Working directory                                                             |
| `hook_event_name` | Name of the lifecycle event                                                   |
| `turn_id`         | Identifier for the current conversation turn                                  |
| `model`           | Active model slug                                                             |
| `permission_mode` | `"default"`, `"acceptEdits"`, `"plan"`, `"dontAsk"`, or `"bypassPermissions"` |

### Event-Specific Fields

| Event(s)                                         | Additional fields                                                   |
| :----------------------------------------------- | :------------------------------------------------------------------ |
| `PreToolUse`, `PostToolUse`, `PermissionRequest` | `tool_name`, `tool_input`, `tool_response`                          |
| `PreCompact`, `PostCompact`                      | `trigger`                                                           |
| `SubagentStart`, `SubagentStop`                  | `agent_type`, `source`                                              |
| `SubagentStop`, `Stop`                           | `stop_hook_active`, `last_assistant_message`                        |
| `SessionStart`                                   | `trigger` — values: `"startup"`, `"resume"`, `"clear"`, `"compact"` |

## Hook outputs

A hook may emit a JSON object on stdout to influence Codex:

| Field                | Description                                                                      |
| :------------------- | :------------------------------------------------------------------------------- |
| `continue`           | Whether to continue the operation                                                |
| `stopReason`         | Reason to stop (if `continue` is false)                                          |
| `systemMessage`      | Message injected as a system message                                             |
| `suppressOutput`     | If `true`, suppresses hook stdout from display (parsed; currently unimplemented) |
| `permissionDecision` | Decision for `PermissionRequest` events                                          |
| `decision`           | Generic decision (e.g., allow/deny)                                              |
| `reason`             | Human-readable rationale for the decision                                        |

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
- **Exit 0 + plain text**: Codex treats the output as additional context (not JSON-parsed).
- **Exit 2 + stderr**: Blocks/denies the action as an alternative to JSON output.
- **Any other non-zero**: Hook failure; Codex continues normally.

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

- [Codex Hooks](https://developers.openai.com/codex/hooks)
- [OpenAI Codex — GitHub](https://github.com/openai/codex)
