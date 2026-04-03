#!/usr/bin/env node

import { createRequire } from 'module'
import { runInstall } from './install.ts'
import { runCheck } from './check.ts'

const require = createRequire(import.meta.url)
const { version } = require('../package.json') as { version: string }

const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'
const DIM = '\x1b[38;5;102m'

function showHelp(): void {
  console.log(`
${BOLD}maconfai${RESET} - Minimal skills manager

${BOLD}Usage:${RESET}
  maconfai install <source> [options]   Install skills from a GitHub repo
  maconfai install                      Interactive uninstall
  maconfai check                        Check for updates (prompts before installing)
  maconfai update                       Check and install updates automatically

${BOLD}Install Options:${RESET}
  -y, --yes                      Skip prompts
  --agents=claude,cursor,codex,open-code  Install to specific agents
  --skills=skill-a,skill-b      Install specific skills
  --mcps=mcp1,mcp2              Install specific MCP servers
  --hooks=hook1,hook2           Install specific hooks
  --branch=<name>                Use a specific branch

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
  ${DIM}$${RESET} maconfai install                              ${DIM}# uninstall mode${RESET}
  ${DIM}$${RESET} maconfai check
`)
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
    case 'add':
    case 'a':
      await runInstall(restArgs)
      break

    case 'check':
    case 'update':
      await runCheck(restArgs, { autoUpdate: command === 'update' })
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
