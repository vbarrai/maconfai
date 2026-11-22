# maconfai

![Build Size](https://img.shields.io/badge/build%20size-32%20kB%20min%2Bgzip-blue)
![Coverage](https://img.shields.io/badge/coverage-90%25-brightgreen)

Minimal skills manager for [Claude Code](https://docs.anthropic.com/en/docs/claude-code), [Cursor](https://cursor.com), [Codex](https://openai.com/index/introducing-codex/), and [Open Code](https://opencode.ai).

Install, update, and uninstall agent skills, MCP servers, and hooks from GitHub repos or local directories.

## Quick start (no install needed)

```bash
npx maconfai install owner/repo
```

## Install globally

```bash
npm i -g maconfai
```

## Usage

```bash
# Install skills, MCP servers and hooks from a GitHub repo (interactive)
maconfai install owner/repo

# Install with no prompts
maconfai install owner/repo -y

# Install from a specific branch
maconfai install owner/repo#develop
maconfai install owner/repo --branch=develop

# Install from a GitHub URL (with optional branch and subpath)
maconfai install https://github.com/owner/repo/tree/main/path/to/skills

# Install from a local directory
maconfai install ./local/path

# Interactive uninstall (current project only)
maconfai install

# Add or remove named configs, with no prompt (for scripts)
maconfai add skill owner/repo skill-a skill-b
maconfai remove skill skill-a

# Show what is installed and whether it is still on disk
maconfai status

# Check for updates, then ask before installing them
maconfai check

# Install and mark every config as trusted (auto-updatable)
maconfai install owner/repo --trusted

# Update only trusted configs (non-trusted ones are blocked)
maconfai update

# Update absolutely everything, bypassing the trust gate
maconfai update --include-untrusted

# Change the trust of installed configs, without reinstalling them
maconfai trust skill-a
maconfai untrust skill-a
```

### Example

Install skills, MCP servers, and hooks from [`vbarrai/config-provider-official`](https://github.com/vbarrai/config-provider-official):

```bash
# Install everything interactively
npx maconfai install vbarrai/config-provider-official

# Skip prompts and install for Claude Code only
npx maconfai install vbarrai/config-provider-official -y --agents=claude-code

# Cherry-pick specific skills
npx maconfai install vbarrai/config-provider-official --skills=pre-commit-checks,simplify
```

### With npx

You can run maconfai without installing it globally using `npx`:

```bash
# Install skills into the current project
npx maconfai install owner/repo

# Skip prompts
npx maconfai install owner/repo -y

# Uninstall mode
npx maconfai install
```

## Commands

| Command                                 | What it does                                                                  |
| :-------------------------------------- | :---------------------------------------------------------------------------- |
| `maconfai install <source> [options]`   | Install skills, MCP servers and hooks from a source (interactive unless `-y`) |
| `maconfai install`                      | Interactive uninstall, for the project in the current directory only          |
| `maconfai add skill <source> <name...>` | Add only these skills (no prompt, removes nothing)                            |
| `maconfai add mcp <source> <name...>`   | Add only these MCP servers                                                    |
| `maconfai add hook <source> <name...>`  | Add only these hooks                                                          |
| `maconfai remove skill <name...>`       | Remove only these skills from the project                                     |
| `maconfai remove mcp <name...>`         | Remove only these MCP servers                                                 |
| `maconfai remove hook <name...>`        | Remove only these hooks                                                       |
| `maconfai check`                        | Check for updates, then ask before installing them                            |
| `maconfai update`                       | Check and install updates automatically                                       |
| `maconfai update --include-untrusted`   | Update every config, including non-trusted ones                               |
| `maconfai trust <name...>`              | Mark installed configs as trusted (nothing is installed)                      |
| `maconfai trust --all`                  | Mark every installed config as trusted                                        |
| `maconfai untrust <name...>`            | Mark installed configs as not trusted (`update` blocks them)                  |
| `maconfai untrust --all`                | Mark every installed config as not trusted                                    |
| `maconfai status`                       | Show what `ai-lock.json` installed and whether it is on disk (read-only)      |
| `maconfai --help`, `maconfai -h`        | Show the usage                                                                |
| `maconfai --version`, `maconfai -v`     | Print the version                                                             |

Short forms: `i` for `install`, `a` for `add`, `rm` for `remove`. `maconfai add <source>` without `skill`, `mcp` or `hook` is the same as `maconfai install <source>`.

### Sources

| Source                                      | Meaning                      |
| :------------------------------------------ | :--------------------------- |
| `owner/repo`                                | GitHub shorthand             |
| `owner/repo#branch`                         | GitHub shorthand with branch |
| `https://github.com/owner/repo`             | GitHub URL                   |
| `https://github.com/owner/repo/tree/branch` | GitHub URL with branch       |
| `./local/path`                              | Local path                   |

### Install options

| Option                                   | Effect                                                                     |
| :--------------------------------------- | :------------------------------------------------------------------------- |
| `-y`, `--yes`                            | Skip prompts                                                               |
| `--trusted`                              | Mark installed configs as trusted (blind auto-update)                      |
| `--force`                                | Replace same-named skill files that `ai-lock.json` does not record         |
| `--agents=claude,cursor,codex,open-code` | Install to specific agents (`claude-code` and `opencode` are accepted too) |
| `--skills=skill-a,skill-b`               | Install specific skills                                                    |
| `--mcps=mcp1,mcp2`                       | Install specific MCP servers                                               |
| `--hooks=hook1,hook2`                    | Install specific hooks                                                     |
| `--branch=<name>`                        | Use a specific branch                                                      |

How `-y` and the lists work together:

- `install <source> -y` with no list installs everything the source holds.
- As soon as one list names something, `-y` installs **only what is named**: `install <source> --skills=a -y` installs skill `a`, and no MCP server or hook. The run says what it left out (`Skipped 1 MCP server(s) and 2 hook(s) not named in --mcps/--hooks`).
- A list **adds, it never removes**. `install <source> --mcps=github -y` keeps the other MCP servers already installed from that source, and says so (`Kept 1 installed MCP server(s) not in --mcps: linear (remove with: maconfai remove mcp <name>)`). The same holds for `--skills` and `--hooks`.
- Only two things remove a config: unchecking it in the interactive lists of `maconfai install`, and `maconfai remove`.

### Add options

| Option                   | Effect                                                             |
| :----------------------- | :----------------------------------------------------------------- |
| `--agents=claude,cursor` | Target agents (default: the agents already in `ai-lock.json`)      |
| `--trusted`              | Mark the added configs as trusted                                  |
| `--force`                | Replace same-named skill files that `ai-lock.json` does not record |
| `--branch=<name>`        | Use a specific branch                                              |

### Update options

| Option                | Effect                                       |
| :-------------------- | :------------------------------------------- |
| `--include-untrusted` | Update all configs, bypassing the trust gate |
| `-y`, `--yes`         | Skip the confirmation prompt (`check` only)  |

## How it works

1. **Discover** — maconfai finds skills using a waterfall strategy (first match wins):
   - `skills/<name>/SKILL.md` — multi-skill repo with a `skills/` wrapper directory
   - `skills/<name>.yml` — **remote skill reference** (see below)
   - `<name>/SKILL.md` — multi-skill repo with skills directly at root level
   - `SKILL.md` at root — single-skill repo

   MCP servers come from a root `mcp.json` or from `mcps/<name>/mcp.json`, hooks from a root `hooks.json` or from `hooks/<name>/hooks.json`.

2. **Select** — Pick which skills, MCP servers, hooks and agents to install to. A first install detects the agents on your machine; afterwards the project's own agents are used, so the result does not depend on who runs the install. Already installed configs are pre-checked; uncheck one to remove it.
3. **Install** — Skills are copied to a canonical `.agents/skills/` directory with symlinks to each agent's skills directory. MCP servers and hooks are merged into each agent's config file. Everything maconfai writes is recorded in `ai-lock.json`: commit it with your project.

maconfai works on the project in the current directory. In your home directory the same paths are your user-level agent configs, so `install -y` refuses to run there, `check` and `update` refuse without a terminal, and an interactive run asks first.

## Status

`maconfai status` compares `ai-lock.json` with the files on disk. It writes nothing.

```text
$ maconfai status
Scope: project (ai-lock.json)

Skills (2)
  beta
    source:  owner/repo
    trusted: yes
    claude-code  present  .claude/skills/beta
    cursor       present  .cursor/skills/beta
  gamma
    source:  owner/repo
    trusted: no (blocked from update)
    claude-code  present  .claude/skills/gamma
    cursor       present  .cursor/skills/gamma

MCP servers (1)
  github
    source:  owner/repo
    trusted: yes
    claude-code  present  .mcp.json
    cursor       missing  .cursor/mcp.json (file not found)

Hooks (1)
  block-rm
    source:  owner/repo
    trusted: yes
    claude-code  present  .claude/settings.json
    cursor       n/a      (no handler recorded for this agent)

Summary: 6 present, 1 missing, 0 different, 0 unknown
```

Each line is one config for one agent:

| State       | Meaning                                                                             |
| :---------- | :---------------------------------------------------------------------------------- |
| `present`   | The file or config entry maconfai wrote is there                                    |
| `missing`   | It is gone (deleted file, broken symlink, entry removed from the config)            |
| `different` | Something is there, but not what maconfai wrote (for example a hand-made directory) |
| `unknown`   | It cannot be told (unreadable or invalid file, lock entry without enough detail)    |
| `n/a`       | Nothing is expected for this agent                                                  |

`status` exits with code 0 even when something is missing: it is a view, not a check. It exits with code 1 only when `ai-lock.json` itself cannot be read. `maconfai update` puts back a missing skill link or MCP config file.

## Scripting: add and remove

`add` and `remove` touch only the configs they name, never prompt, and exit with code 1 (with an `Error:` message) when they cannot do the whole job. Use them in scripts and CI; keep `install` to review a whole source.

```bash
# Add two skills, one MCP server and one hook from a source
maconfai add skill owner/repo skill-a skill-b
maconfai add mcp owner/repo github
maconfai add hook owner/repo block-rm

# First add in a project: say which agents to target
maconfai add skill owner/repo skill-a --agents=claude,cursor

# Remove them again
maconfai remove skill skill-a skill-b
maconfai remove mcp github
maconfai remove hook block-rm
```

- `add` installs to the agents already recorded in `ai-lock.json`. In a project without any, pass `--agents=`.
- `add` fails without writing anything when a name is not in the source (`Not found in the source: …`), and never removes or replaces another config.
- `remove` takes names only (no option), checks every name against `ai-lock.json` before touching anything, and cleans only what maconfai wrote: a same-named skill or MCP server you added by hand for another agent stays.
- Names can be separated by spaces or commas.

## Hand-written skills are protected

A skill directory that `ai-lock.json` does not record was written by you or by another tool. maconfai never replaces it silently, never offers it in the uninstall list, and never removes it.

```text
$ maconfai add skill owner/repo handmade
Error: Refusing to overwrite skill files that ai-lock.json does not record (written by hand or by another tool):
  handmade: .claude/skills/handmade
Rename or move them, or re-run with --force to replace them.
```

`install` refuses the same way. Pass `--force` to `install` or `add` to replace the files on purpose.

The same care applies elsewhere:

- An MCP server already present in an agent config under the same name, and not installed by maconfai, is kept as it is: `install` does not overwrite it, `add mcp` fails.
- The interactive uninstall (`maconfai install` without a source) lists only what the `ai-lock.json` of the current project records. Skills in your home directory (`~/.claude/skills`, `~/.agents/skills`…) are never listed nor removed. To uninstall from another project, `cd` into it first.
- `maconfai install -y` without a source is refused: with no source there is nothing to install, and removing everything without asking is never what a script wants.

## Trusted configs

Each installed config (skill, MCP server, or hook) carries a `trusted` boolean in `ai-lock.json`. It controls how `maconfai update` treats that config:

- **Trusted** — `maconfai update` fetches and installs the latest content blindly, without asking.
- **Not trusted** (the default for new installs) — `maconfai update` **blocks** the config and reports it. Nothing is changed.
- **`maconfai update --include-untrusted`** — updates every config, trusted or not, bypassing the gate for that run.

Trust is set on the installer side (never declared by the source repo, so a compromised source cannot self-certify):

| How                                     | Result                                                                   |
| :-------------------------------------- | :----------------------------------------------------------------------- |
| `maconfai install owner/repo --trusted` | Marks all installed configs as trusted                                   |
| Interactive install                     | Prompts once whether to trust the configs in this run                    |
| `maconfai install owner/repo -y`        | New configs default to non-trusted; reinstalls keep their existing trust |
| `maconfai add skill … --trusted`        | Marks the added configs as trusted                                       |
| `maconfai trust <name...>`              | Marks configs that are already installed as trusted                      |
| `maconfai untrust <name...>`            | Marks configs that are already installed as not trusted                  |

`trust` and `untrust` only write the `trusted` field: nothing is installed, updated or removed.

```bash
# Trust one skill, one MCP server and one hook
maconfai trust skill-a mcp:github hook:block-rm

# Trust everything that is installed
maconfai trust --all

# Stop a config from updating by itself
maconfai untrust skill-a

# Stop everything from updating by itself
maconfai untrust --all
```

A bare name must match exactly one installed config. When a skill and an MCP server (or a hook) share a name, say which one with `skill:<name>`, `mcp:<name>` or `hook:<name>`. A name that matches nothing fails, and nothing is written.

When `update` blocks configs, it prints the command that trusts them:

```text
▲  1 item(s) blocked (not trusted):
│
│    - gamma
│
●  To keep them updating, run: maconfai trust gamma
│
●  To update them once: maconfai update --include-untrusted
```

Configs installed before this feature existed (no `trusted` field in the lock) are grandfathered as trusted, so `maconfai update` keeps working for them.

## Updates

`maconfai check` lists the available updates and asks before installing them (`-y` skips the question). `maconfai update` installs them without asking. Both apply the trust gate above.

- A GitHub source is compared through the GitHub API, a local source by the content of its files.
- A skill link or an MCP config file that was deleted is put back.
- A skill whose folder no longer exists in the source is listed as skipped, with the reason `Not found in the source`, and left installed. A local source that does not exist on this machine is skipped too.
- When GitHub refuses the check (bad token, rate limit, network, private repository without access), the configs that could not be checked are listed, the others are still updated, and the command **exits with code 1**.

### GitHub token

maconfai uses the first token it finds in `GITHUB_TOKEN`, `GH_TOKEN`, then `gh auth token`. It serves the update check and the clone of private repositories. The token is given to git as an HTTP header through the environment, never in the clone URL, and it is masked in error messages. This needs **git 2.31 or later**: an older git ignores it, so public repositories still clone but private ones fail.

## Remote skill references

A `skills/<name>.yml` file turns a repo into a **skill registry** — it points to a skill hosted elsewhere without copying it.

```yaml
# skills/skill-creator.yml
source: anthropics/claude-plugins-official/plugins/skill-creator
include: [skills, mcps, hooks]
prefix: official
```

| Field     | Default    | Description                                                                                           |
| :-------- | :--------- | :---------------------------------------------------------------------------------------------------- |
| `source`  | —          | Where the skill lives: `owner/repo`, `owner/repo/subpath`, `owner/repo#branch`, a URL or a local path |
| `include` | `[skills]` | What to pull from the remote: `skills`, `mcps`, `hooks`                                               |
| `prefix`  | —          | Prefix applied to installed skill names, MCP keys, and hook group names                               |

With `prefix: official`, a remote skill named `skill-creator` is installed as `official-skill-creator` (directory name and frontmatter `name:` field both updated). MCP server `github` becomes `official-github`, etc.

### How it works

When installing from a registry repo, maconfai fetches each referenced skill directly from its origin. The `ai-lock.json` tracks the **remote** source, so `maconfai check` detects updates from the original repo — not the registry. Circular references (a ref pointing to another ref) are detected and skipped with a warning.

## Supported agents

| Agent       | Skills | MCP servers | Hooks | Skills dir          | MCP config           | Hooks config            |
| :---------- | :----: | :---------: | :---: | :------------------ | :------------------- | :---------------------- |
| Claude Code |   ✅   |     ✅      |  ✅   | `.claude/skills/`   | `.mcp.json`          | `.claude/settings.json` |
| Cursor      |   ✅   |     ✅      |  ✅   | `.cursor/skills/`   | `.cursor/mcp.json`   | `.cursor/hooks.json`    |
| Codex       |   ✅   |     ✅      |  ✅   | `.codex/skills/`    | `.codex/config.toml` | `.codex/hooks.json`     |
| Open Code   |   ✅   |     ✅      |   —   | `.opencode/skills/` | `opencode.json`      | —                       |

Canonical location: `.agents/skills/` (agent dirs are symlinked to this). Companion files of a hook (scripts) are copied to `.agents/hooks/<name>/`.

### MCP format translation

A single `mcp.json` source is converted to each agent's native format:

| Agent       | What changes                                                                                                                                                                                                                                                  |
| :---------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Claude Code | Nothing: `${VAR}` and `${VAR:-default}` are written as they are                                                                                                                                                                                               |
| Cursor      | `${VAR}` becomes `${env:VAR}`. Cursor has no default-value syntax, so `${VAR:-default}` becomes `${env:VAR}` and a warning names the variable. Cursor's own variables (`${workspaceFolder}`, `${userHome}`…) are kept                                         |
| Codex       | Written as TOML under `[mcp_servers.<name>]`; the rest of `.codex/config.toml` is kept. `Authorization: Bearer ${VAR}` becomes `bearer_token_env_var`, a header that is exactly `${VAR}` goes to `env_http_headers`, an env entry `KEY: ${KEY}` to `env_vars` |
| Open Code   | Servers go under the `mcp` key, with an array `command` and `environment` instead of `env`; `${VAR}` becomes `{env:VAR}`                                                                                                                                      |

maconfai only writes project files. When a server it installs is also defined under the same name in your user-level config of that agent, it prints a warning: the two definitions can conflict, keep one of them.

## Development

```bash
pnpm install
pnpm run dev           # Run CLI in dev mode
pnpm test              # Run tests (vitest, watch mode)
npx vitest run         # Run tests once
pnpm typecheck         # TypeScript type checking
pnpm lint              # Lint with oxlint
pnpm knip              # Detect unused code and dependencies
pnpm prettier          # Check formatting (used in CI)
pnpm prettier:format   # Format all files with Prettier
pnpm run ci            # Everything CI runs: checks, tests, build
```

`pnpm run ci`, not `pnpm ci`: pnpm keeps the bare `ci` name for a command of its own.

## License

MIT
