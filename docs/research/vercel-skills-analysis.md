# Analyse de vercel-labs/skills — Concurrent direct

> Recherche effectuée le 2026-03-14
> Repo: https://github.com/vercel-labs/skills
> Version analysée: 1.4.5

## Vue d'ensemble

CLI universelle pour installer des skills (SKILL.md) vers 45+ agents IA.
Package npm `skills`, utilisable via `npx skills add owner/repo`.
Stack: TypeScript ESM, pnpm, MIT.

## Mapping agents complet

| Agent | `--agent` | Project Path | Global Path |
|-------|-----------|-------------|-------------|
| Amp, Kimi CLI, Replit, Universal | `amp`, `kimi-cli`, `replit`, `universal` | `.agents/skills/` | `~/.config/agents/skills/` |
| Antigravity | `antigravity` | `.agent/skills/` | `~/.gemini/antigravity/skills/` |
| Augment | `augment` | `.augment/skills/` | `~/.augment/skills/` |
| Claude Code | `claude-code` | `.claude/skills/` | `~/.claude/skills/` |
| OpenClaw | `openclaw` | `skills/` | `~/.openclaw/skills/` |
| Cline, Warp | `cline`, `warp` | `.agents/skills/` | `~/.agents/skills/` |
| CodeBuddy | `codebuddy` | `.codebuddy/skills/` | `~/.codebuddy/skills/` |
| Codex | `codex` | `.agents/skills/` | `~/.codex/skills/` |
| Command Code | `command-code` | `.commandcode/skills/` | `~/.commandcode/skills/` |
| Continue | `continue` | `.continue/skills/` | `~/.continue/skills/` |
| Cortex Code | `cortex` | `.cortex/skills/` | `~/.snowflake/cortex/skills/` |
| Crush | `crush` | `.crush/skills/` | `~/.config/crush/skills/` |
| Cursor | `cursor` | `.agents/skills/` | `~/.cursor/skills/` |
| Droid | `droid` | `.factory/skills/` | `~/.factory/skills/` |
| Gemini CLI | `gemini-cli` | `.agents/skills/` | `~/.gemini/skills/` |
| GitHub Copilot | `github-copilot` | `.agents/skills/` | `~/.copilot/skills/` |
| Goose | `goose` | `.goose/skills/` | `~/.config/goose/skills/` |
| Junie | `junie` | `.junie/skills/` | `~/.junie/skills/` |
| iFlow CLI | `iflow-cli` | `.iflow/skills/` | `~/.iflow/skills/` |
| Kilo Code | `kilo` | `.kilocode/skills/` | `~/.kilocode/skills/` |
| Kiro CLI | `kiro-cli` | `.kiro/skills/` | `~/.kiro/skills/` |
| Kode | `kode` | `.kode/skills/` | `~/.kode/skills/` |
| MCPJam | `mcpjam` | `.mcpjam/skills/` | `~/.mcpjam/skills/` |
| Mistral Vibe | `mistral-vibe` | `.vibe/skills/` | `~/.vibe/skills/` |
| Mux | `mux` | `.mux/skills/` | `~/.mux/skills/` |
| OpenCode | `opencode` | `.agents/skills/` | `~/.config/opencode/skills/` |
| OpenHands | `openhands` | `.openhands/skills/` | `~/.openhands/skills/` |
| Pi | `pi` | `.pi/skills/` | `~/.pi/agent/skills/` |
| Qoder | `qoder` | `.qoder/skills/` | `~/.qoder/skills/` |
| Qwen Code | `qwen-code` | `.qwen/skills/` | `~/.qwen/skills/` |
| Roo Code | `roo` | `.roo/skills/` | `~/.roo/skills/` |
| Trae | `trae` | `.trae/skills/` | `~/.trae/skills/` |
| Trae CN | `trae-cn` | `.trae/skills/` | `~/.trae-cn/skills/` |
| Windsurf | `windsurf` | `.windsurf/skills/` | `~/.codeium/windsurf/skills/` |
| Zencoder | `zencoder` | `.zencoder/skills/` | `~/.zencoder/skills/` |
| Neovate | `neovate` | `.neovate/skills/` | `~/.neovate/skills/` |
| Pochi | `pochi` | `.pochi/skills/` | `~/.pochi/skills/` |
| AdaL | `adal` | `.adal/skills/` | `~/.adal/skills/` |

### Concept "Universal Agents"

Agents partageant `.agents/skills/` : Amp, Codex, Gemini CLI, GitHub Copilot, OpenCode, Kimi CLI, Replit, Cline, Warp, Cursor.
Ces agents ne recoivent pas de symlink redondant — le dir canonique EST leur dir de skills.

## Fonctionnalités

### Ce qu'ils ont

| Fonctionnalité | Description |
|----------------|-------------|
| `skills add` | Installer depuis GitHub, GitLab, Git SSH, local, Well-Known URLs |
| `skills find` | Recherche interactive (fzf-style) via API skills.sh |
| `skills list` | Lister les skills installés, groupés par plugin |
| `skills init` | Scaffolding d'un nouveau SKILL.md |
| `skills check` | Détecter les mises à jour via GitHub tree SHA |
| `skills update` | Mettre à jour les skills |
| `skills remove` | Désinstaller des skills |
| `skills sync` | Sync depuis node_modules (npm packages) |
| Install global | `-g` pour `~/.<agent>/skills/` |
| Symlink + fallback copy | Symlink par défaut, copy si ça échoue |
| Plugin Manifest | `.claude-plugin/marketplace.json` |
| Provider system | Extensible (GitHub, GitLab, Well-Known) |
| Télémétrie | Usage anonyme |
| Subpath install | `owner/repo/tree/main/skills/specific-skill` |
| `--copy` flag | Forcer la copie au lieu de symlinks |

### Ce qu'ils n'ont PAS (nos avantages)

| Fonctionnalité | maconfai | vercel/skills |
|----------------|----------|---------------|
| Support MCP servers | Oui | Non |
| Env var translation | Oui (`${VAR}` → `${env:VAR}`) | Non |
| MCP merge | Oui (merge dans `.mcp.json`) | Non |
| Lock par projet | Oui | Non (global) |

## Architecture comparée

| Aspect | maconfai | vercel/skills |
|--------|----------|---------------|
| Dir canonique | `.agents/skills/<name>/` | `.agents/skills/<name>/` |
| Symlinks | Oui | Oui + fallback copy |
| Lock file | `.agents/.lock.json` | `~/.agents/.skill-lock.json` (XDG) |
| Git operations | `simple-git` | Git clone natif |
| Source parsing | GitHub, owner/repo, local | GitHub, GitLab, Git SSH, local, Well-Known |
| Skill discovery | `skills/` uniquement | 30+ dirs + récursif depth 5 |
| Security | Basique | `sanitizeName()`, `isPathSafe()`, `isSubpathSafe()` |
| Agents | 5 | 45+ |

## Liens utiles

- Spec: https://agentskills.io
- Registre: https://skills.sh
- Skills officiels Vercel: https://github.com/vercel-labs/agent-skills

## Plan d'action recommandé

### Court terme
1. Ajouter les agents manquants (copier leur mapping)
2. Concept "Universal Agents" (éviter symlinks redondants)
3. Install global (`-g`)
4. `sanitizeName()` plus robuste
5. Fallback copy quand symlink échoue

### Moyen terme
6. Commande `list` (lister les skills installés)
7. Commande `init` (scaffold SKILL.md)
8. Support GitLab + Git SSH
9. Subpath dans l'URL source

### Long terme
10. Well-Known provider (RFC 8615)
11. Plugin Manifest (marketplace.json)
12. Registre centralisé
13. GitHub tree SHA pour update detection
