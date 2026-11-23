> **maconfai support: Not supported** — Gemini CLI agent is not yet implemented in maconfai. Reference only.

# Gemini CLI — Skills Guide

> Official source: [geminicli.com/docs/cli/skills](https://geminicli.com/docs/cli/skills/)

> **Notice (from the official pages)**: "Gemini CLI was replaced by Antigravity CLI on June 18th, 2026" for unpaid-tier and Google One users; the details below may not apply to Antigravity.

## Overview

Gemini CLI supports the open Agent Skills standard with progressive disclosure:

| Level         | When Loaded                                                                    | Content                       |
| :------------ | :----------------------------------------------------------------------------- | :---------------------------- |
| **Discovery** | At startup                                                                     | `name` and `description` only |
| **Injection** | When relevant — `SKILL.md` body and folder structure are injected into history | Full SKILL.md body            |
| **Execution** | On demand                                                                      | Scripts, resources, assets    |

## Locations

| Scope     | Path                                  | Alias                              |
| :-------- | :------------------------------------ | :--------------------------------- |
| Workspace | `.gemini/skills/<name>/SKILL.md`      | `.agents/skills/<name>/SKILL.md`   |
| User      | `~/.gemini/skills/<name>/SKILL.md`    | `~/.agents/skills/<name>/SKILL.md` |
| Extension | Bundled inside an installed extension | —                                  |
| Built-in  | Shipped with the CLI binary           | —                                  |

**Priority**: Workspace > User > Extension > Built-in. The `.agents/skills/` alias takes priority over `.gemini/skills/` within the same tier.

**Compatibility**: the `.agents/skills/` directory is shared with Claude Code without modification.

## SKILL.md Format

```yaml
---
name: my-skill
description: What the skill does and when to use it.
---
Instructions for the agent...
```

> **Important**: Gemini CLI only recognizes `name` and `description` in the frontmatter. No additional fields like `version`, `mode`, or `disable-model-invocation` (those are specific to Claude Code).

## Activation Lifecycle

1. **Discovery**: Only `name` and `description` are loaded at startup
2. **Identification**: Gemini autonomously decides to use a skill based on the prompt and description
3. **Consent**: A confirmation prompt appears (name, purpose, directory path)
4. **Injection**: `SKILL.md` body and folder structure are added to conversation history
5. **Execution**: Scripts and resources are loaded on demand

> **Security**: All skill and extension activations require explicit user consent via the policy engine.

> **Note**: The model activates a skill via an explicit `activate_skill` tool call.

## Invocation Control

Gemini CLI does **not** support frontmatter-based invocation control (no `disable-model-invocation`, `user-invocable`, or `allowed-tools` fields). The only recognized frontmatter fields are `name` and `description`.

However, Gemini CLI provides **runtime skill management** via slash commands:

| Command                                         | Description                                                                              |
| :---------------------------------------------- | :--------------------------------------------------------------------------------------- |
| `/skills`                                       | List all available skills and their current status                                       |
| `/skills list [all] [nodesc]`                   | List skills (explicit form; `all` includes built-in skills, `nodesc` omits descriptions) |
| `/skills disable <name>`                        | Disable a skill (user scope by default; `--scope workspace` for workspace settings)      |
| `/skills enable <name>`                         | Re-enable a previously disabled skill (same `--scope` option)                            |
| `/skills link <path> [--scope user\|workspace]` | Symlink a skill from a local directory                                                   |
| `/skills reload` (alias: `/skills refresh`)     | Refresh skill discovery                                                                  |

And via terminal commands:

| Command                                                                   | Description                                                                                                                                                                                                                                                        |
| :------------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gemini skills list --all`                                                | List installed skills (`--all` includes built-ins)                                                                                                                                                                                                                 |
| `gemini skills install <url\|path> [--scope workspace\|user] [--consent]` | Install from URL or path; default scope is `user` (`--scope workspace` for project-local). `--path <subdir>` to install from a subdirectory of a Git repo. `--consent` acknowledges the security risks and skips the interactive confirmation during installation. |
| `gemini skills uninstall <name> [--scope user\|workspace]`                | Uninstall a skill from the given scope                                                                                                                                                                                                                             |

All skill activations require **explicit user consent** — Gemini always prompts (name, purpose, directory path) before injecting a skill; on approval the skill directory becomes an allowed file path so bundled assets can be read. Workspace skills are shared through version control: review them like other project code.

## Built-in Skills

- **skill-creator**: helps create new skills (v0.25.0+, built-in since v0.26.0+)

## No `agents/google.yaml`

Unlike Codex which has an `agents/openai.yaml` file for UI metadata and invocation policy, Gemini CLI **does not have** an equivalent. All skill configuration goes through the `SKILL.md` frontmatter.

## Sources

- [Agent Skills](https://geminicli.com/docs/cli/skills/)
- [Creating Agent Skills](https://geminicli.com/docs/cli/creating-skills/)
- [Agent Skills Standard](https://agentskills.io)
