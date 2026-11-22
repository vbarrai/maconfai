> **maconfai support: Not supported** — Open Code hooks are plugin-based and not managed by maconfai. Reference only.

# Open Code — Hooks Guide (Plugins)

> Official source: [opencode.ai/docs/plugins](https://opencode.ai/docs/plugins/) (V2, latest); V1: [opencode.ai/v1/docs/plugins](https://opencode.ai/v1/docs/plugins/)

> **Versions**: `opencode.ai/docs/` now documents **OpenCode V2 (latest)**; the V1 documentation lives under `opencode.ai/v1/docs/`. The sections below describe the V1 shape unless a section says V2. V2 reads existing V1 config from the same locations and normalizes it in memory without rewriting the file, so V1-format files keep working (source: [opencode.ai/docs/migrate-v1](https://opencode.ai/docs/migrate-v1/)).

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

## V2 (latest) differences

**V1 plugins do not run in V2** and must be ported (see the V2 plugin migration guide). Source: [opencode.ai/docs/migrate-v1](https://opencode.ai/docs/migrate-v1/) and [opencode.ai/docs/plugins](https://opencode.ai/docs/plugins/).

| Setting              | V1                         | V2                                                                     |
| :------------------- | :------------------------- | :--------------------------------------------------------------------- |
| Config key           | `plugin`                   | `plugins`                                                              |
| Package with options | `["pkg", { ... }]` tuple   | `{ "package": "...", "options": { ... } }` object                      |
| Local plugin path    | `./plugin/local.ts` (file) | `./plugin/local` (directory with `index.ts`; a single file is skipped) |
| Discovery folder     | `.opencode/plugins/`       | `.opencode/plugins/` (`.opencode/plugin/` also discovered)             |

V2 `plugins` entries can be npm names (`name`, `name@1.2.0`, `@scope/name`), local directories (relative paths resolve from the config file that contains them, or absolute / `file://`), Git specifications, or objects with options. Arrays from all applicable config files (`~/.config/opencode/opencode.jsonc` < `./opencode.jsonc` < `./.opencode/opencode.jsonc`) are combined; `*` enables every plugin, a `-` prefix disables an ID, and a later ID re-enables it. A `plugins/` directory beside a project-root config file is not discovered automatically (configure it, or move it under `.opencode/`). CLI: `opencode plugin add|list|check|update|remove`. Plugins naming a moving target (`@latest`, ranges, Git branches) update on startup and every 24 hours; exact versions and commit hashes stay pinned. TUI-only plugins are configured in a separate `cli.json`. The V2 plugin page does not list the plugin function signature, event names or hooks (see its "Build a plugin" page); the event table above is from the V1 page.

## Plugin signature, hooks and custom tools (V1 page)

- Signature: `export const MyPlugin = async (ctx) => { return { ... } }`, with context `project`, `client`, `$` (Bun shell API), `directory`, `worktree`; TypeScript type `Plugin` from `@opencode-ai/plugin`.
- Events are subscribed through the `event` hook (receives `{ event }`). Other hooks: `tool.execute.before`, `tool.execute.after`, `shell.env`, `experimental.session.compacting` (`output.context` array to append to, or `output.prompt` to replace the compaction prompt), and `tool` to register custom tools.
- Custom tools use the `tool` helper from `@opencode-ai/plugin` with `description`, `args` (Zod schema via `tool.schema`) and `execute(args, context)`; a plugin tool with the same name as a built-in tool takes precedence.
- Logging: `client.app.log()` with `service`, `level` (`debug`, `info`, `warn`, `error`), `message`, `extra`.
- Dependencies: a `package.json` in `.opencode/`; OpenCode runs `bun install` at startup.

## Why Not Supported by maconfai

Open Code's hook system is plugin-based (imperative JavaScript/TypeScript code), not declarative JSON configuration files like Claude Code's `settings.json` or Cursor's `hooks.json`. This makes automatic installation via config merging impractical.

## Sources

- [Open Code Plugins](https://opencode.ai/docs/plugins/)
