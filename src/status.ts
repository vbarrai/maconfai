import { existsSync } from 'fs'
import { lstat, readdir, readFile, realpath } from 'fs/promises'
import { join } from 'path'
import type { AgentConfig, AgentType, HookEvents } from './types.ts'
import { agents } from './agents.ts'
import { sanitizeName } from './installer.ts'
import { readLock } from './lock.ts'

// Read-only view of `ai-lock.json` against the disk. Nothing in this module writes.

type TargetState = 'present' | 'missing' | 'different' | 'unknown' | 'n/a'

interface TargetStatus {
  agent: string
  state: TargetState
  path?: string
  detail?: string
}

interface EntryStatus {
  name: string
  source: string
  ref?: string
  // undefined: the entry predates the field.
  trusted?: boolean
  agents?: string[]
  targets: TargetStatus[]
}

interface StatusReport {
  // 'invalid': unparseable (e.g. merge conflict markers) or without `version`/`skills`.
  lock: 'none' | 'invalid' | 'ok'
  skills: EntryStatus[]
  mcpServers: EntryStatus[]
  hooks: EntryStatus[]
}

const CANONICAL_SKILLS_DIR = join('.agents', 'skills')

// A hand-edited lock may name an agent that does not exist.
function tryResolveAgent(agent: string): AgentConfig | null {
  return Object.hasOwn(agents, agent) ? agents[agent as AgentType] : null
}

// Only "the path does not exist" is missing: EACCES, EISDIR or an I/O error means the
// file may well be there, so it is reported as unreadable, not as missing.
type TextRead =
  | { kind: 'missing' }
  | { kind: 'unreadable'; code: string }
  | { kind: 'ok'; text: string }

async function readText(path: string): Promise<TextRead> {
  try {
    return { kind: 'ok', text: await readFile(path, 'utf-8') }
  } catch (err) {
    const code = (err as NodeJS.ErrnoException | null)?.code ?? 'error'
    return code === 'ENOENT' || code === 'ENOTDIR'
      ? { kind: 'missing' }
      : { kind: 'unreadable', code }
  }
}

type JsonRead =
  | Exclude<TextRead, { kind: 'ok' }>
  | { kind: 'invalid' }
  | { kind: 'ok'; data: unknown }

async function readJson(path: string): Promise<JsonRead> {
  const read = await readText(path)
  if (read.kind !== 'ok') return read
  if (read.text.trim() === '') return { kind: 'ok', data: {} }
  try {
    return { kind: 'ok', data: JSON.parse(read.text) }
  } catch {
    return { kind: 'invalid' }
  }
}

// What a config that could not be read tells about a target: missing or unknown.
function unreadTarget(
  agent: string,
  path: string,
  read: Exclude<JsonRead, { kind: 'ok' }>,
): TargetStatus {
  if (read.kind === 'missing') return { agent, state: 'missing', path, detail: 'file not found' }
  if (read.kind === 'unreadable') {
    return { agent, state: 'unknown', path, detail: `unreadable: ${read.code}` }
  }
  return { agent, state: 'unknown', path, detail: 'invalid JSON' }
}

async function skillTarget(name: string, agent: string, cwd: string): Promise<TargetStatus> {
  const config = tryResolveAgent(agent)
  if (!config) return { agent, state: 'unknown', detail: 'unknown agent' }

  const dirName = sanitizeName(name)
  const path = join(config.skillsDir, dirName)
  const agentDir = join(cwd, path)
  const stats = await lstat(agentDir).catch(() => null)
  if (!stats) return { agent, state: 'missing', path }

  const canonical = join(CANONICAL_SKILLS_DIR, dirName)
  const [realAgent, realCanonical] = await Promise.all([
    realpath(agentDir).catch(() => null),
    realpath(join(cwd, canonical)).catch(() => null),
  ])
  // A dangling symlink: the canonical copy it points to is gone.
  if (!realAgent) return { agent, state: 'missing', path, detail: 'broken symlink' }
  if (!existsSync(join(agentDir, 'SKILL.md'))) {
    return { agent, state: 'missing', path, detail: 'no SKILL.md' }
  }
  if (realCanonical && realAgent === realCanonical) return { agent, state: 'present', path }
  if (!realCanonical) {
    return { agent, state: 'different', path, detail: `${canonical} is missing` }
  }
  if (stats.isSymbolicLink()) {
    return { agent, state: 'different', path, detail: `symlink does not point to ${canonical}` }
  }
  // `installSkill` copies instead of linking where symlinks fail (e.g. Windows without
  // symlink rights): an identical copy is what maconfai wrote, a differing one is not.
  return (await sameTree(agentDir, join(cwd, canonical)))
    ? { agent, state: 'present', path, detail: `copy of ${canonical}` }
    : { agent, state: 'different', path, detail: `real directory, differs from ${canonical}` }
}

async function sameTree(a: string, b: string): Promise<boolean> {
  try {
    const [entriesA, entriesB] = await Promise.all([readdir(a), readdir(b)])
    if (entriesA.sort().join('\0') !== entriesB.sort().join('\0')) return false
    for (const name of entriesA) {
      const [statA, statB] = await Promise.all([lstat(join(a, name)), lstat(join(b, name))])
      if (statA.isDirectory() !== statB.isDirectory()) return false
      if (statA.isDirectory()) {
        if (!(await sameTree(join(a, name), join(b, name)))) return false
        continue
      }
      const [contentA, contentB] = await Promise.all([
        readFile(join(a, name)),
        readFile(join(b, name)),
      ])
      if (!contentA.equals(contentB)) return false
    }
    return true
  } catch {
    return false
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// `[mcp_servers.name]`, `[mcp_servers."name"]` or `[mcp_servers.'name']`.
function codexHasServer(toml: string, name: string): boolean {
  const key = escapeRegExp(name)
  const header = new RegExp(
    `^\\s*\\[\\s*mcp_servers\\s*\\.\\s*(?:${key}|"${key}"|'${key}')\\s*\\]`,
    'm',
  )
  return header.test(toml)
}

async function mcpTarget(name: string, agent: string, cwd: string): Promise<TargetStatus> {
  const config = tryResolveAgent(agent)
  if (!config) return { agent, state: 'unknown', detail: 'unknown agent' }
  if (!config.mcpConfigPath) return { agent, state: 'n/a', detail: 'agent has no MCP config' }

  const path = config.mcpConfigPath
  const filePath = join(cwd, path)

  if (config.mcpConfigFormat === 'codex') {
    const toml = await readText(filePath)
    if (toml.kind !== 'ok') return unreadTarget(agent, path, toml)
    return { agent, state: codexHasServer(toml.text, name) ? 'present' : 'missing', path }
  }

  const json = await readJson(filePath)
  if (json.kind !== 'ok') return unreadTarget(agent, path, json)
  // Open Code keeps its servers under `mcp`, the other JSON configs under `mcpServers`.
  const key = config.mcpConfigFormat === 'opencode' ? 'mcp' : 'mcpServers'
  const servers = (json.data as Record<string, unknown> | null)?.[key]
  // Own keys only: `toString` must not be found in an empty config.
  const found = servers && typeof servers === 'object' && Object.hasOwn(servers, name)
  return { agent, state: found ? 'present' : 'missing', path }
}

// Companion scripts a handler runs from `.agents/hooks/<group>/`.
function companionPaths(handlers: HookEvents): string[] {
  const paths = new Set<string>()
  const text = JSON.stringify(handlers)
  for (const match of text.matchAll(/\.agents\/hooks\/[^\s"'`;|&)\\]+/g)) paths.add(match[0])
  return [...paths]
}

async function hookTarget(
  recorded: HookEvents | undefined,
  hasHandlersField: boolean,
  agent: string,
  cwd: string,
): Promise<TargetStatus> {
  const config = tryResolveAgent(agent)
  if (!config) return { agent, state: 'unknown', detail: 'unknown agent' }
  if (!config.hooksConfigPath) return { agent, state: 'n/a', detail: 'agent has no hooks config' }

  // The source has no handler for this agent, so nothing is expected on disk.
  if (hasHandlersField && !recorded) {
    return { agent, state: 'n/a', detail: 'no handler recorded for this agent' }
  }

  const path = config.hooksConfigPath
  const json = await readJson(join(cwd, path))
  if (json.kind !== 'ok') return unreadTarget(agent, path, json)

  if (!recorded) {
    return { agent, state: 'unknown', path, detail: 'lock does not record handlers' }
  }

  const hooks = ((json.data as { hooks?: unknown } | null)?.hooks ?? {}) as Record<string, unknown>
  let expected = 0
  let found = 0
  for (const [event, handlers] of Object.entries(recorded)) {
    const installed = Array.isArray(hooks[event]) ? (hooks[event] as unknown[]) : []
    const installedJson = new Set(installed.map((h) => JSON.stringify(h)))
    for (const handler of handlers) {
      expected++
      if (installedJson.has(JSON.stringify(handler))) found++
    }
  }

  if (found === 0) return { agent, state: 'missing', path, detail: 'handlers not found' }
  if (found < expected) {
    return { agent, state: 'different', path, detail: `${found}/${expected} handlers found` }
  }

  const missingScripts = companionPaths(recorded).filter((p) => !existsSync(join(cwd, p)))
  if (missingScripts.length > 0) {
    return {
      agent,
      state: 'missing',
      path,
      detail: `script not found: ${missingScripts.join(', ')}`,
    }
  }
  return { agent, state: 'present', path }
}

function sortedEntries<T>(record: Record<string, T>): [string, T][] {
  return Object.entries(record).sort(([a], [b]) => a.localeCompare(b))
}

async function getStatus(cwd = process.cwd()): Promise<StatusReport> {
  // readLock() turns an unreadable lock into an empty one; status must say so instead.
  const raw = await readJson(join(cwd, 'ai-lock.json'))
  if (raw.kind !== 'ok') {
    const state = raw.kind === 'missing' ? 'none' : 'invalid'
    return { lock: state, skills: [], mcpServers: [], hooks: [] }
  }
  const parsed = raw.data as { version?: unknown; skills?: unknown } | null
  if (typeof parsed?.version !== 'number' || !parsed.skills) {
    return { lock: 'invalid', skills: [], mcpServers: [], hooks: [] }
  }
  const lock = await readLock(cwd)

  const skills = await Promise.all(
    sortedEntries(lock.skills).map(async ([name, entry]) => ({
      name,
      source: entry.source,
      ref: entry.ref,
      trusted: entry.trusted,
      agents: entry.agents,
      targets: await Promise.all((entry.agents ?? []).map((a) => skillTarget(name, a, cwd))),
    })),
  )

  const mcpServers = await Promise.all(
    sortedEntries(lock.mcpServers).map(async ([name, entry]) => ({
      name,
      source: entry.source,
      ref: entry.ref,
      trusted: entry.trusted,
      agents: entry.agents,
      targets: await Promise.all((entry.agents ?? []).map((a) => mcpTarget(name, a, cwd))),
    })),
  )

  const hooks = await Promise.all(
    sortedEntries(lock.hooks).map(async ([name, entry]) => {
      const handlers = entry.handlers as Record<string, HookEvents | undefined> | undefined
      // An agent may be listed without handlers, or have handlers without being listed.
      const targetAgents = [...new Set([...(entry.agents ?? []), ...Object.keys(handlers ?? {})])]
      return {
        name,
        source: entry.source,
        ref: entry.ref,
        trusted: entry.trusted,
        agents: entry.agents,
        targets: await Promise.all(
          targetAgents.map((a) => hookTarget(handlers?.[a], handlers !== undefined, a, cwd)),
        ),
      }
    }),
  )

  return { lock: 'ok', skills, mcpServers, hooks }
}

// An entry without the field predates it: update treats it as trusted.
function formatTrusted(trusted: boolean | undefined): string {
  if (trusted === undefined) return 'not recorded (treated as trusted)'
  return trusted ? 'yes' : 'no (blocked from update)'
}

function formatSection(title: string, entries: EntryStatus[]): string[] {
  const lines = [`${title} (${entries.length})`]
  if (entries.length === 0) return [...lines, '  none']

  for (const entry of entries) {
    const source = entry.ref ? `${entry.source}#${entry.ref}` : entry.source
    lines.push(`  ${entry.name}`)
    lines.push(`    source:  ${source}`)
    lines.push(`    trusted: ${formatTrusted(entry.trusted)}`)
    if (!entry.agents) lines.push('    agents:  not recorded')
    if (entry.targets.length === 0) continue

    const agentWidth = Math.max(...entry.targets.map((t) => t.agent.length))
    const stateWidth = Math.max(...entry.targets.map((t) => t.state.length))
    for (const target of entry.targets) {
      const where = [target.path, target.detail && `(${target.detail})`].filter(Boolean).join(' ')
      const line = `    ${target.agent.padEnd(agentWidth)}  ${target.state.padEnd(stateWidth)}  ${where}`
      lines.push(line.trimEnd())
    }
  }
  return lines
}

function formatStatus(report: StatusReport): string {
  if (report.lock === 'none') {
    return 'No ai-lock.json here: maconfai has installed nothing in this project.'
  }
  if (report.lock === 'invalid') {
    return (
      'ai-lock.json is not a readable, valid lock file (unreadable, invalid JSON, merge ' +
      'conflict markers, or no "version"/"skills"): fix it before trusting maconfai here.'
    )
  }

  const all = [...report.skills, ...report.mcpServers, ...report.hooks].flatMap((e) => e.targets)
  const count = (state: TargetState) => all.filter((t) => t.state === state).length
  const summary = (['present', 'missing', 'different', 'unknown'] as const)
    .map((state) => `${count(state)} ${state}`)
    .join(', ')

  return [
    'Scope: project (ai-lock.json)',
    '',
    ...formatSection('Skills', report.skills),
    '',
    ...formatSection('MCP servers', report.mcpServers),
    '',
    ...formatSection('Hooks', report.hooks),
    '',
    `Summary: ${summary}`,
  ].join('\n')
}

export async function statusText(cwd = process.cwd()): Promise<string> {
  return formatStatus(await getStatus(cwd))
}

// Exit code 0 even when targets are missing: this is a view, not a check. Only an
// unreadable lock, where there is nothing to show, exits 1.
export async function runStatus(): Promise<void> {
  const report = await getStatus()
  console.log(formatStatus(report))
  if (report.lock === 'invalid') process.exitCode = 1
}
