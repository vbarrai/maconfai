> **maconfai support: Not supported** — Hooks are not managed by maconfai. Reference only.

# OpenAI Codex — Hooks Guide

> Official source: [github.com/openai/codex](https://github.com/openai/codex)

## Overview

Codex has limited hook support compared to Claude Code or Cursor. The main hook mechanism is commit attribution.

## Commit Attribution

Codex uses an automatically managed `prepare-commit-msg` hook for co-author attribution. Configurable via `command_attribution`:

- **Default label**: standard attribution
- **Custom label**: custom label
- **Disable**: disable attribution

## Sources

- [OpenAI Codex — GitHub](https://github.com/openai/codex)
