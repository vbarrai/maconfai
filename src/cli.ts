#!/usr/bin/env node

import { createRequire } from 'module'
import { runInstall } from './install.ts'
import { isItemKind, runAdd, runRemove } from './add-remove.ts'
import { runCheck } from './check.ts'
import { runStatus } from './status.ts'
import { runTrust, runUntrust } from './trust.ts'

const require = createRequire(import.meta.url)
const { version } = require('../package.json') as { version: string }

const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'
const DIM = '\x1b[38;5;102m'

function showHelp(): void {
  console.log(`
${BOLD}maconfai${RESET} - Minimal skills manager

${BOLD}Usage:${RESET}
  maconfai install <source> [options]   Install skills from a GitHub repo (interactive)
  maconfai install                      Interactive uninstall (current project only)
  maconfai add skill <source> <name...> Add only these skills (no prompt, removes nothing)
  maconfai add mcp <source> <name...>   Add only these MCP servers
  maconfai add hook <source> <name...>  Add only these hooks
  maconfai remove skill <name...>       Remove only these skills from the project
  maconfai remove mcp <name...>         Remove only these MCP servers
  maconfai remove hook <name...>        Remove only these hooks
  maconfai check                        Check for updates (prompts before installing)
  maconfai update                       Check and install updates automatically
  maconfai update --include-untrusted   Update every config, including non-trusted ones
  maconfai trust <name...>              Mark installed configs as trusted (no install)
  maconfai trust --all                  Mark every installed config as trusted
  maconfai untrust <name...>            Mark installed configs as not trusted (update blocks them)
  maconfai untrust --all                Mark every installed config as not trusted
  maconfai status                       Show what ai-lock.json installed and whether it is on disk (read-only)

${BOLD}Install Options:${RESET}
  -y, --yes                      Skip prompts
  --trusted                      Mark installed configs as trusted (blind auto-update)
  --force                        Replace same-named skill files ai-lock.json does not record
  --agents=claude,cursor,codex,open-code  Install to specific agents
  --skills=skill-a,skill-b      Install specific skills
  --mcps=mcp1,mcp2              Install specific MCP servers
  --hooks=hook1,hook2           Install specific hooks
  --branch=<name>                Use a specific branch

${BOLD}Add Options:${RESET}
  --agents=claude,cursor         Target agents (default: the agents already in ai-lock.json)
  --trusted                      Mark the added configs as trusted
  --force                        Replace same-named skill files ai-lock.json does not record
  --branch=<name>                Use a specific branch

${BOLD}Uninstall:${RESET}
  Only the project in the current directory: its ai-lock.json and its files.
  User-scope skills (~/.claude/skills, ~/.agents/skills…) are never touched.
  To uninstall from another project: cd into it, then run maconfai install.

${BOLD}Update Options:${RESET}
  --include-untrusted            Update all configs, bypassing the trust gate
  -y, --yes                      Skip the confirmation prompt (check only)

${BOLD}Sources:${RESET}
  owner/repo                             GitHub shorthand
  owner/repo#branch                      GitHub shorthand with branch
  https://github.com/owner/repo          GitHub URL
  https://github.com/owner/repo/tree/branch  GitHub URL with branch
  ./local/path                           Local path

${BOLD}Examples:${RESET}
  ${DIM}$${RESET} maconfai install vercel-labs/agent-skills
  ${DIM}$${RESET} maconfai install vercel-labs/agent-skills#develop
  ${DIM}$${RESET} maconfai install vercel-labs/agent-skills --branch=develop
  ${DIM}$${RESET} maconfai install vercel-labs/agent-skills -y
  ${DIM}$${RESET} npx maconfai install owner/repo
  ${DIM}$${RESET} cd my-project && maconfai install             ${DIM}# uninstall mode (this project only)${RESET}
  ${DIM}$${RESET} maconfai check
  ${DIM}$${RESET} maconfai add skill owner/repo skill-a skill-b   ${DIM}# scriptable${RESET}
  ${DIM}$${RESET} maconfai remove skill skill-a
`)
}

// Errors of the scriptable commands: one line on stderr and a failing exit code
async function runCommand(command: () => Promise<void>): Promise<void> {
  try {
    await command()
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp()
    return
  }

  const command = args[0]!
  const restArgs = args.slice(1)

  switch (command) {
    case 'install':
    case 'i':
      await runInstall(restArgs)
      break

    case 'add':
    case 'a': {
      // `add <source> …` without a kind stays an alias of `install`
      const kind = restArgs[0]
      if (isItemKind(kind)) await runCommand(() => runAdd(kind, restArgs.slice(1)))
      else await runInstall(restArgs)
      break
    }

    case 'remove':
    case 'rm':
      await runCommand(() => {
        const kind = restArgs[0]
        if (!isItemKind(kind)) throw new Error('Usage: maconfai remove skill|mcp|hook <name...>')
        return runRemove(kind, restArgs.slice(1))
      })
      break

    case 'check':
    case 'update':
      await runCheck(restArgs, { autoUpdate: command === 'update' })
      break

    case 'trust':
      await runTrust(restArgs)
      break

    case 'untrust':
      await runUntrust(restArgs)
      break

    case 'status':
      await runStatus()
      break

    case '--version':
    case '-v':
      console.log(version)
      break

    default:
      console.log(`Unknown command: ${command}`)
      console.log(`Run ${BOLD}maconfai --help${RESET} for usage.`)
  }
}

main()
