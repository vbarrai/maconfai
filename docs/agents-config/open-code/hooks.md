> **maconfai support: Not supported** — Open Code hooks are plugin-based and not managed by maconfai. Reference only.

# Open Code — Hooks Guide (Plugins)

> Official source: [opencode.ai/docs/plugins](https://opencode.ai/docs/plugins/)

## Overview

Open Code uses a plugin system instead of declarative hook configuration files. Plugins are JavaScript/TypeScript modules that hook into various lifecycle events.

## Plugin Locations

| Scope   | Path                                |
| :------ | :---------------------------------- |
| Project | `.opencode/plugins/<name>.ts`       |
| Global  | `~/.config/opencode/plugins/<name>.ts` |

Plugins can also be loaded from npm packages via the `plugin` option in `opencode.json`.

## Plugin Configuration

```json
{
  "plugin": {
    "my-plugin": {
      "source": "npm:@my-org/opencode-plugin",
      "config": {
        "key": "value"
      }
    }
  }
}
```

## Common Hook Events

| Event                  | Description                         |
| :--------------------- | :---------------------------------- |
| `tool.execute.before`  | Intercept tool execution arguments  |
| `tool.execute.after`   | Access results after execution      |

## Why Not Supported by maconfai

Open Code's hook system is plugin-based (imperative JavaScript/TypeScript code), not declarative JSON configuration files like Claude Code's `settings.json` or Cursor's `hooks.json`. This makes automatic installation via config merging impractical.

## Sources

- [Open Code Plugins](https://opencode.ai/docs/plugins/)
