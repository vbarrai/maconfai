> **maconfai support: Not supported** — Hooks are not yet managed by maconfai for Codex. Codex hooks now share the same shape as Claude Code hooks. Adding `hooks.json` install support for Codex is a candidate roadmap item.

# OpenAI Codex — Hooks Guide

> Official source: [developers.openai.com/codex/hooks](https://developers.openai.com/codex/hooks) (secondary: [github.com/openai/codex](https://github.com/openai/codex))

## Overview

Codex supports a hooks system aligned with Claude Code's hooks: lifecycle events can trigger user-defined commands, with structured stdin payloads and structured outputs that can influence agent behavior.

## Lifecycle Events

| Event               | Description                                       |
| :------------------ | :------------------------------------------------ |
| `SessionStart`      | Fires when a Codex session begins. Matcher filters on source: `startup`, `resume`, `clear`, `compact` |
| `SubagentStart`     | Fires when a sub-agent is launched                |
| `PreToolUse`        | Fires before a tool call is executed              |
| `PermissionRequest` | Fires when Codex needs to request user permission |
| `PostToolUse`       | Fires after a tool call completes                 |
| `UserPromptSubmit`  | Fires when the user submits a prompt              |
| `PreCompact`        | Fires before context compaction. Matcher filters on `manual` or `auto` |
| `PostCompact`       | Fires after context compaction. Matcher filters on `manual` or `auto`  |
| `Stop`              | Fires when the session is about to stop           |
| `SubagentStop`      | Fires when a sub-agent finishes                   |

## Configuration Locations

Hooks can be defined in any of the following locations (merged in precedence order):

| Location                                        | Scope                                                                                                        |
| :---------------------------------------------- | :----------------------------------------------------------------------------------------------------------- |
| `~/.codex/hooks.json`                           | User-level                                                                                                   |
| `~/.codex/config.toml` (inline `[hooks]` table) | User-level                                                                                                   |
| `<repo>/.codex/hooks.json`                      | Project-level                                                                                                |
| `<repo>/.codex/config.toml` (inline `[hooks]`)  | Project-level                                                                                                |
| `requirements.toml`                             | Admin/policy. Set `allow_managed_hooks_only = true` to ignore lower-scope hooks. Use `managed_dir` / `windows_managed_dir` under `[hooks]` to specify the managed hooks directory. |
| `.codex-plugin/plugin.json`                     | Plugin manifest contributing hooks                                                                           |

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

| Field            | Type   | Description                                                                       |
| :--------------- | :----- | :-------------------------------------------------------------------------------- |
| `matcher`        | string | Pattern to match against tool name or context                                     |
| `type`           | string | Handler type — currently only `"command"`                                         |
| `command`        | string | Shell command to execute                                                          |
| `commandWindows` | string | Windows-specific command override (optional)                                      |
| `timeout`        | number | Timeout in seconds (default: 600)                                                 |
| `statusMessage`  | string | Optional message displayed while the hook runs                                    |

## Hook stdin JSON

Hooks receive a JSON payload on stdin:

| Field             | Description                                  |
| :---------------- | :------------------------------------------- |
| `session_id`      | Current Codex session id                     |
| `transcript_path` | Path to the session transcript               |
| `cwd`             | Working directory                            |
| `hook_event_name` | Name of the lifecycle event                  |
| `turn_id`         | Identifier for the current conversation turn |
| `model`           | Model currently in use                       |
| `permission_mode` | Current permission mode                      |

## Hook outputs

A hook may emit a JSON object on stdout to influence Codex:

| Field                | Description                                                                  |
| :------------------- | :--------------------------------------------------------------------------- |
| `continue`           | Whether to continue the operation                                            |
| `stopReason`         | Reason to stop (if `continue` is false)                                      |
| `suppressOutput`     | If `true`, suppresses hook stdout from being shown (parsed but not yet implemented) |
| `systemMessage`      | Message injected as a system message                                         |
| `permissionDecision` | Decision for `PermissionRequest` events                                      |
| `decision`           | Generic decision (e.g., allow/deny)                                          |
| `reason`             | Human-readable rationale for the decision                                    |
| `hookSpecificOutput` | Event-specific structured output. For `PreToolUse`: `permissionDecision` + `updatedInput` (rewrite tool input). For `PostToolUse`: `additionalContext`. |

## Commit Attribution

Commit attribution is configured via the `command_attribution` field.

Per [openai/codex#11617](https://github.com/openai/codex/pull/11617) (merged 2026-02), the title and body of the PR describe two different mechanisms (prompt-based vs. `prepare-commit-msg` hook injected via `core.hooksPath`). The merged PR's "Summary of changes" explicitly keeps `command_attribution` config support (default Codex label, blank disables, custom label supported). The on-disk mechanism is out of scope for this doc until confirmed against `codex-rs` sources.

- **Default label**: standard attribution
- **Custom label**: custom label
- **Disable**: disable attribution

## Sources

- [Codex Hooks](https://developers.openai.com/codex/hooks)
- [OpenAI Codex — GitHub](https://github.com/openai/codex)
