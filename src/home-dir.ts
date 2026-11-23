import * as p from '@clack/prompts'
import pc from 'picocolors'
import { realpathSync } from 'fs'
import { homedir } from 'os'

function isHomeDir(dir: string): boolean {
  try {
    return realpathSync(dir) === realpathSync(homedir())
  } catch {
    return false
  }
}

// In $HOME the project paths are the agents' user config (~/.claude/settings.json,
// ~/.cursor/mcp.json, ~/.codex/config.toml) and ~/.mcp.json is read by no agent:
// refuse when nobody can answer, ask otherwise.
export async function guardHomeDir(canAsk: boolean, refusalHint: string): Promise<void> {
  if (!isHomeDir(process.cwd())) return
  const warning =
    'You are in your home directory: project files written here are your user-level agent configs.'
  if (!canAsk) {
    p.log.error(pc.red(`${warning} ${refusalHint}`))
    process.exit(1)
  }
  p.log.warn(warning)
  const proceed = await p.confirm({ message: 'Run here anyway?', initialValue: false })
  if (p.isCancel(proceed) || !proceed) {
    p.cancel('Cancelled')
    process.exit(0)
  }
}
