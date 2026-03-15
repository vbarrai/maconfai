import { readFile, writeFile, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import type { AgentType, HookEvents } from './types.ts'
import { agents } from './agents.ts'

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
  options: { cwd?: string } = {},
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

    if (!hooks[eventName]) {
      hooks[eventName] = []
    }

    // Append new handlers to the event array
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

async function listInstalledHookEventNames(options: { cwd?: string } = {}): Promise<Set<string>> {
  const cwd = options.cwd || process.cwd()
  const names = new Set<string>()

  for (const agent of Object.values(agents)) {
    if (!agent.hooksConfigPath) continue
    const config = await readJsonFile(join(cwd, agent.hooksConfigPath))
    const hooks = config.hooks as Record<string, unknown[]> | undefined
    if (hooks) {
      for (const name of Object.keys(hooks)) {
        names.add(name)
      }
    }
  }

  return names
}

async function uninstallHooks(
  hookGroupEvents: HookEvents,
  agentType: AgentType,
  options: { cwd?: string } = {},
): Promise<void> {
  const agent = agents[agentType]
  if (!agent.hooksConfigPath) return

  const cwd = options.cwd || process.cwd()
  const configPath = join(cwd, agent.hooksConfigPath)
  const config = await readJsonFile(configPath)

  const hooks = config.hooks as Record<string, unknown[]> | undefined
  if (!hooks) return

  for (const [eventName, handlersToRemove] of Object.entries(hookGroupEvents)) {
    if (!hooks[eventName]) continue

    const removeJsonSet = new Set((handlersToRemove as unknown[]).map((h) => JSON.stringify(h)))

    hooks[eventName] = hooks[eventName]!.filter((h) => !removeJsonSet.has(JSON.stringify(h)))

    if (hooks[eventName]!.length === 0) {
      delete hooks[eventName]
    }
  }

  await writeJsonFile(configPath, config)
}
