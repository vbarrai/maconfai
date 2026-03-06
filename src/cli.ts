#!/usr/bin/env node

import { runInstall } from './install.ts';
import { runCheck } from './check.ts';

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[38;5;102m';
const TEXT = '\x1b[38;5;145m';

function showHelp(): void {
  console.log(`
${BOLD}confai${RESET} - Minimal skills manager

${BOLD}Usage:${RESET}
  confai install <source> [options]   Install skills from a GitHub repo
  confai install                      Interactive uninstall
  confai check                        Check for updates and install them

${BOLD}Install Options:${RESET}
  -y, --yes       Skip prompts

${BOLD}Sources:${RESET}
  owner/repo                             GitHub shorthand
  https://github.com/owner/repo          GitHub URL
  ./local/path                           Local path

${BOLD}Examples:${RESET}
  ${DIM}$${RESET} confai install vercel-labs/agent-skills
  ${DIM}$${RESET} confai install vercel-labs/agent-skills -y
  ${DIM}$${RESET} npx confai install owner/repo
  ${DIM}$${RESET} confai install                              ${DIM}# uninstall mode${RESET}
  ${DIM}$${RESET} confai check
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  const command = args[0]!;
  const restArgs = args.slice(1);

  switch (command) {
    case 'install':
    case 'i':
    case 'add':
    case 'a':
      await runInstall(restArgs);
      break;

    case 'check':
    case 'update':
      await runCheck();
      break;

    case '--version':
    case '-v':
      console.log('0.1.0');
      break;

    default:
      console.log(`Unknown command: ${command}`);
      console.log(`Run ${BOLD}confai --help${RESET} for usage.`);
  }
}

main();
