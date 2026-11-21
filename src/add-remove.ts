import * as p from '@clack/prompts'
import pc from 'picocolors'
import { lstat, realpath, rm } from 'fs/promises'
import { dirname, join } from 'path'
import { runInstall } from './install.ts'
import { sanitizeName, uninstallSkill } from './installer.ts'
import { uninstallMcpServers } from './mcp.ts'
import { uninstallHooks } from './hooks.ts'
import { agents } from './agents.ts'
import { readLock, removeFromLock, removeMcpFromLock, removeHookFromLock } from './lock.ts'
import type { AgentType, HookEvents } from './types.ts'

// `maconfai add|remove <kind> …`: the scriptable commands. Each one touches only the
// items it names; the interactive `install` stays the way to review a whole source.
const KIND_FLAG = { skill: 'skills', mcp: 'mcps', hook: 'hooks' } as const
type ItemKind = keyof typeof KIND_FLAG

export function isItemKind(value: string | undefined): value is ItemKind {
  return value !== undefined && Object.hasOwn(KIND_FLAG, value)
}

const ALL_AGENTS = Object.keys(agents) as AgentType[]
const isKnownAgent = (a: string): a is AgentType => Object.hasOwn(agents, a)
// Value options match by prefix, switches exactly: `--trusted=false` is not `--trusted`
const ADD_VALUE_FLAGS = ['--agents=', '--branch=']
const ADD_SWITCHES = ['--trusted', '--force', '-y', '--yes']
const isAddFlag = (f: string) =>
  ADD_SWITCHES.includes(f) || ADD_VALUE_FLAGS.some((prefix) => f.startsWith(prefix))

function names(args: string[]): string[] {
  return args
    .filter((a) => !a.startsWith('-'))
    .flatMap((a) => a.split(','))
    .map((a) => a.trim())
    .filter(Boolean)
}

// Agents already used in this project, as ai-lock.json records them. A name this version
// does not know (a lock written by another version) is left out.
async function lockAgents(): Promise<AgentType[]> {
  const lock = await readLock()
  const entries = [
    ...Object.values(lock.skills),
    ...Object.values(lock.mcpServers),
    ...Object.values(lock.hooks),
  ]
  return [...new Set(entries.flatMap((e) => e.agents ?? []))].filter(isKnownAgent)
}

export async function runAdd(kind: ItemKind, args: string[]): Promise<void> {
  const [source, ...rest] = args.filter((a) => !a.startsWith('-'))
  const itemNames = names(rest)
  if (!source || itemNames.length === 0) {
    throw new Error(
      `Usage: maconfai add ${kind} <source> <name...> [--agents=...] [--trusted] [--force]`,
    )
  }
  const flags = args.filter((a) => a.startsWith('-'))
  const unknown = flags.filter((f) => !isAddFlag(f))
  if (unknown.length > 0) throw new Error(`Unknown option for add: ${unknown.join(', ')}`)

  const agentsFlag = flags.find((f) => f.startsWith('--agents='))
  if (agentsFlag && !agentsFlag.slice('--agents='.length).replaceAll(',', '').trim()) {
    throw new Error('--agents is empty: name at least one agent, or leave it out')
  }

  let defaultAgents: AgentType[] | undefined
  if (!agentsFlag) {
    defaultAgents = await lockAgents()
    if (defaultAgents.length === 0) {
      throw new Error(
        `No agent recorded in ai-lock.json yet: pass --agents=${ALL_AGENTS.join(',')}`,
      )
    }
  }

  // Name only the requested items; the two other lists stay empty so nothing else is added
  const lists = { skills: '', mcps: '', hooks: '' }
  lists[KIND_FLAG[kind]] = itemNames.join(',')
  await runInstall(
    [
      source,
      '-y',
      `--skills=${lists.skills}`,
      `--mcps=${lists.mcps}`,
      `--hooks=${lists.hooks}`,
      ...flags.filter((f) => f !== '-y' && f !== '--yes'),
    ],
    { strict: true, defaultAgents },
  )
}

function canonicalDir(name: string): string {
  return join(process.cwd(), '.agents', 'skills', sanitizeName(name))
}

// True when the agent's skill dir is a symlink to our canonical copy, i.e. one we wrote
async function linksToCanonical(name: string, agent: AgentType): Promise<boolean> {
  const link = join(process.cwd(), agents[agent].skillsDir, sanitizeName(name))
  try {
    if (!(await lstat(link)).isSymbolicLink()) return false
    return (await realpath(link)) === (await realpath(canonicalDir(name)))
  } catch {
    return false
  }
}

export async function runRemove(kind: ItemKind, args: string[]): Promise<void> {
  const itemNames = names(args)
  if (itemNames.length === 0) throw new Error(`Usage: maconfai remove ${kind} <name...>`)
  // remove always cleans every agent: an option such as --agents would be silently ignored
  const flags = args.filter((a) => a.startsWith('-'))
  if (flags.length > 0) throw new Error(`Unknown option for remove: ${flags.join(', ')}`)

  // Validate every name before touching anything
  const lock = await readLock()
  const entries = { skill: lock.skills, mcp: lock.mcpServers, hook: lock.hooks }[kind]
  const missing = itemNames.filter((n) => !Object.hasOwn(entries, n))
  if (missing.length > 0) {
    const installed = Object.keys(entries).join(', ') || 'none'
    throw new Error(`Not in ai-lock.json: ${missing.join(', ')} (installed ${kind}s: ${installed})`)
  }
  if (kind === 'mcp') {
    // Without recorded agents we cannot tell our config entries from hand-written ones
    const unknownAgents = itemNames.filter((n) => !lock.mcpServers[n]!.agents)
    if (unknownAgents.length > 0) {
      throw new Error(
        `Cannot remove ${unknownAgents.join(', ')}: its ai-lock.json entry does not record its agents. Reinstall it with \`maconfai add mcp\`, then remove it.`,
      )
    }
  }
  if (kind === 'hook') {
    // A lock written before `handlers` existed does not say what was written where
    const unknownHandlers = itemNames.filter((n) => !lock.hooks[n]!.handlers)
    if (unknownHandlers.length > 0) {
      throw new Error(
        `Cannot remove ${unknownHandlers.join(', ')}: its ai-lock.json entry predates recorded handlers. Reinstall it with \`maconfai add hook\`, then remove it.`,
      )
    }
  }

  console.log()
  p.intro(pc.bgCyan(pc.black(' maconfai remove ')))

  for (const name of itemNames) {
    if (kind === 'skill') {
      // Only what we own: the recorded agents, plus any other agent dir holding our symlink
      // to the canonical copy. A hand-written skill of the same name elsewhere is kept.
      const recorded = (lock.skills[name]!.agents ?? []).filter(isKnownAgent)
      for (const agent of ALL_AGENTS) {
        if (recorded.includes(agent) || (await linksToCanonical(name, agent))) {
          await uninstallSkill(name, agent, { global: false, keepCanonical: true })
        }
      }
      // The canonical copy is always ours: every install of a skill writes it.
      await rm(canonicalDir(name), { recursive: true, force: true })
      await removeFromLock(name)
    } else if (kind === 'mcp') {
      // Only the configs we wrote: a server of the same name elsewhere is not ours
      for (const agent of lock.mcpServers[name]!.agents!.filter(isKnownAgent)) {
        await uninstallMcpServers([name], agent)
      }
      await removeMcpFromLock(name)
    } else {
      for (const [agent, handlers] of Object.entries(lock.hooks[name]!.handlers!)) {
        if (handlers && isKnownAgent(agent)) await uninstallHooks(handlers as HookEvents, agent)
      }
      // Companion files copied from hooks/<name>/; the name comes from a file, keep it one level deep
      const hooksDir = join(process.cwd(), '.agents', 'hooks')
      const companionDir = join(hooksDir, name)
      if (dirname(companionDir) === hooksDir) {
        await rm(companionDir, { recursive: true, force: true })
      }
      await removeHookFromLock(name)
    }
  }

  p.log.success(pc.green(`Removed ${kind}(s): ${itemNames.join(', ')}`))
  p.outro(pc.green('Done!'))
}
