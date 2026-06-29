> **maconfai support: Not supported** — Open Code hooks are plugin-based and not managed by maconfai. Reference only.

# Open Code — Hooks Guide (Plugins)

> Official source: [opencode.ai/docs/plugins](https://opencode.ai/docs/plugins/)

## Overview

Open Code uses a plugin system instead of declarative hook configuration files. Plugins are JavaScript/TypeScript modules that hook into various lifecycle events.

## Plugin Locations

| Scope   | Path                                   |
| :------ | :------------------------------------- |
| Project | `.opencode/plugins/<name>.ts`          |
| Global  | `~/.config/opencode/plugins/<name>.ts` |

Plugins can also be loaded from npm packages via the `plugin` option in `opencode.json`.

## Plugin Configuration

The `plugin` field is an **array of npm package names**:

```json
{
  "plugin": ["opencode-helicone-session", "@my-org/opencode-plugin"]
}
```

> Plugins listed in the `plugin` array of `opencode.json` are installed automatically using Bun at startup — no user-authored `package.json` is required. A `package.json` in `.opencode/` is only needed for **local** plugins (`.opencode/plugins/<name>.ts`) that import external npm packages. npm plugins are cached at `~/.cache/opencode/node_modules/`.

**Plugin load order**: global config → project config → global plugin directory → project plugin directory.

## Common Hook Events

The plugin event catalog includes a wide range of lifecycle hooks:

| Event namespace                   | Documented events                                                                                                                               |
| :-------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------- |
| `session.*`                       | `session.created`, `session.deleted`, `session.idle`, `session.compacted`, `session.diff`, `session.error`, `session.status`, `session.updated` |
| `message.*`                       | `message.updated`, `message.removed`, `message.part.updated`, `message.part.removed`                                                            |
| `file.*`                          | `file.edited`, `file.watcher.updated`                                                                                                           |
| `lsp.*`                           | `lsp.client.diagnostics`, `lsp.updated`                                                                                                         |
| `permission.*`                    | `permission.asked`, `permission.replied`                                                                                                        |
| `tool.execute.before`             | Intercept tool execution arguments                                                                                                              |
| `tool.execute.after`              | Access results after execution                                                                                                                  |
| `command.executed`                | A slash or shell command finished                                                                                                               |
| `todo.updated`                    | Todo list changed                                                                                                                               |
| `tui.*`                           | `tui.prompt.append`, `tui.command.execute`, `tui.toast.show`                                                                                    |
| `shell.env`                       | Shell environment resolution                                                                                                                    |
| `server.connected`                | Backend/server connection established                                                                                                           |
| `installation.updated`            | Open Code installation/update events                                                                                                            |
| `experimental.session.compacting` | Experimental session compaction event                                                                                                           |

## Why Not Supported by maconfai

Open Code's hook system is plugin-based (imperative JavaScript/TypeScript code), not declarative JSON configuration files like Claude Code's `settings.json` or Cursor's `hooks.json`. This makes automatic installation via config merging impractical.

## Sources

- [Open Code Plugins](https://opencode.ai/docs/plugins/)
