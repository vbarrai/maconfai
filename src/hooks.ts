import { readFile, writeFile, mkdir, readdir, cp, rm } from 'fs/promises'
import { join, dirname } from 'path'
import type { AgentType, HookEvents } from './types.ts'
import { agents } from './agents.ts'

const AGENTS_DIR = '.agents'
const HOOKS_SUBDIR = 'hooks'

async function readJsonFile(filePath: string): Promise<Record<string, unknown>> {
  try {
    const content = await readFile(filePath, 'utf-8')
    return JSON.parse(content) as Record<string, unknown>
  } catch {
    return {}
  }
}

async function writeJsonFile(filePath: string, data: Record<string, unknown>): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8')
}

export async function installHooks(
  hookEvents: HookEvents,
  agentType: AgentType,
  options: { cwd?: string; force?: boolean } = {},
): Promise<{ installed: string[]; skipped: string[] }> {
  const agent = agents[agentType]
  if (!agent.hooksConfigPath || !agent.hooksConfigFormat) {
    return { installed: [], skipped: Object.keys(hookEvents) }
  }

  const cwd = options.cwd || process.cwd()
  const configPath = join(cwd, agent.hooksConfigPath)
  const config = await readJsonFile(configPath)

  if (agent.hooksConfigFormat === 'dedicated') {
    // Cursor: { version: 1, hooks: { eventName: [...] } }
    if (!config.version) config.version = 1
    if (!config.hooks) config.hooks = {}
  } else {
    // Claude Code: { hooks: { EventName: [...] }, ...otherSettings }
    if (!config.hooks) config.hooks = {}
  }

  const hooks = config.hooks as Record<string, unknown[]>
  const installed: string[] = []
  const skipped: string[] = []

  for (const [eventName, handlers] of Object.entries(hookEvents)) {
    if (!Array.isArray(handlers) || handlers.length === 0) continue

    if (options.force) {
      if (!hooks[eventName]) {
        hooks[eventName] = []
      }
      const existing = hooks[eventName]!
      for (const handler of handlers) {
        const matcher = (handler as Record<string, unknown>).matcher
        const idx =
          matcher !== undefined
            ? existing.findIndex((h) => (h as Record<string, unknown>).matcher === matcher)
            : existing.findIndex((h) => JSON.stringify(h) === JSON.stringify(handler))
        if (idx !== -1) {
          existing[idx] = handler
        } else {
          existing.push(handler)
        }
      }
      installed.push(eventName)
      continue
    }

    if (!hooks[eventName]) {
      hooks[eventName] = []
    }

    const existing = hooks[eventName]!
    const existingJson = existing.map((h) => JSON.stringify(h))
    let addedAny = false

    for (const handler of handlers) {
      const handlerJson = JSON.stringify(handler)
      if (!existingJson.includes(handlerJson)) {
        existing.push(handler)
        addedAny = true
      }
    }

    if (addedAny) {
      installed.push(eventName)
    } else {
      skipped.push(eventName)
    }
  }

  if (installed.length > 0) {
    await writeJsonFile(configPath, config)
  }

  return { installed, skipped }
}

/**
 * Copies companion files (scripts, etc.) from a hook source directory
 * to .agents/hooks/<hookName>/ in the target project.
 * Skips hooks.json itself — only companion files are copied.
 */
export async function installHookFiles(
  sourcePath: string,
  hookName: string,
  options: { cwd?: string } = {},
): Promise<boolean> {
  const cwd = options.cwd || process.cwd()
  const destDir = join(cwd, AGENTS_DIR, HOOKS_SUBDIR, hookName)

  try {
    const entries = await readdir(sourcePath, { withFileTypes: true })
    const companions = entries.filter((e) => e.name !== 'hooks.json')

    if (companions.length === 0) return true

    await rm(destDir, { recursive: true, force: true }).catch(() => {})
    await mkdir(destDir, { recursive: true })

    for (const entry of companions) {
      const srcPath = join(sourcePath, entry.name)
      const destPath = join(destDir, entry.name)
      await cp(srcPath, destPath, { recursive: true, dereference: true })
    }

    return true
  } catch {
    return false
  }
}
