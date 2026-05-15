> **maconfai support: Not supported** — Hooks are not yet managed by maconfai for Codex. Codex hooks now share the same shape as Claude Code hooks. Adding `hooks.json` install support for Codex is a candidate roadmap item.

# OpenAI Codex — Hooks Guide

> Official source: [developers.openai.com/codex/hooks](https://developers.openai.com/codex/hooks) (secondary: [github.com/openai/codex](https://github.com/openai/codex))

## Overview

Codex supports a hooks system aligned with Claude Code's hooks: lifecycle events can trigger user-defined commands, with structured stdin payloads and structured outputs that can influence agent behavior.

## Lifecycle Events

| Event               | Description                                                       |
| :------------------ | :---------------------------------------------------------------- |
| `SessionStart`      | Fires when a Codex session begins                                 |
| `PreToolUse`        | Fires before a tool call is executed                              |
| `PermissionRequest` | Fires when Codex needs to request user permission                 |
| `PostToolUse`       | Fires after a tool call completes                                 |
| `UserPromptSubmit`  | Fires when the user submits a prompt                              |
| `Stop`              | Fires when the session is about to stop                           |

## Configuration Locations

Hooks can be defined in any of the following locations (merged in precedence order):

| Location                        | Scope                            |
| :------------------------------ | :------------------------------- |
| `~/.codex/hooks.json`           | User-level                       |
| `<repo>/.codex/hooks.json`      | Project-level                    |
| `[hooks]` table in `config.toml` | User or project config           |
| `requirements.toml`             | Enterprise policy                |
| `<plugin>/hooks/hooks.json`     | Plugin-provided                  |

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

| Field           | Type   | Description                                                  |
| :-------------- | :----- | :----------------------------------------------------------- |
| `matcher`       | string | Pattern to match against tool name or context                |
| `type`          | string | Handler type — currently only `"command"`                    |
| `command`       | string | Shell command to execute                                     |
| `timeout`       | number | Timeout in seconds (default: 600)                            |
| `statusMessage` | string | Optional message displayed while the hook runs               |

## Hook stdin JSON

Hooks receive a JSON payload on stdin:

| Field             | Description                                  |
| :---------------- | :------------------------------------------- |
| `session_id`      | Current Codex session id                     |
| `transcript_path` | Path to the session transcript               |
| `cwd`             | Working directory                            |
| `hook_event_name` | Name of the lifecycle event                  |
| `turn_id`         | Identifier for the current conversation turn |

## Hook outputs

A hook may emit a JSON object on stdout to influence Codex:

| Field                | Description                                                       |
| :------------------- | :---------------------------------------------------------------- |
| `continue`           | Whether to continue the operation                                 |
| `stopReason`         | Reason to stop (if `continue` is false)                           |
| `systemMessage`      | Message injected as a system message                              |
| `permissionDecision` | Decision for `PermissionRequest` events                           |
| `decision`           | Generic decision (e.g., allow/deny)                               |
| `reason`             | Human-readable rationale for the decision                         |

## Commit Attribution

Commit attribution is configured via the `commit_attribution` field (not `command_attribution`).

Per [openai/codex#11617](https://github.com/openai/codex/pull/11617) (merged 2026-02), the mechanism is now **prompt-injection of a `Co-authored-by` trailer into the model prompt** — not a literal `prepare-commit-msg` git hook. The model is instructed to include the trailer in commit messages it generates.

- **Default label**: standard attribution
- **Custom label**: custom label
- **Disable**: disable attribution

## Sources

- [Codex Hooks](https://developers.openai.com/codex/hooks)
- [OpenAI Codex — GitHub](https://github.com/openai/codex)
