import * as p from '@clack/prompts'
import pc from 'picocolors'
import { readLock, writeLock } from './lock.ts'

type Lock = Awaited<ReturnType<typeof readLock>>
type Kind = 'skill' | 'mcp' | 'hook'

const KIND_NAMES: Record<Kind, string> = { skill: 'a skill', mcp: 'an MCP server', hook: 'a hook' }

function lockEntries(lock: Lock) {
  const sections = [
    { kind: 'skill' as Kind, prefix: '', entries: lock.skills },
    { kind: 'mcp' as Kind, prefix: 'MCP: ', entries: lock.mcpServers },
    { kind: 'hook' as Kind, prefix: 'hook: ', entries: lock.hooks },
  ]
  return sections.flatMap(({ kind, prefix, entries }) =>
    Object.entries(entries).map(([name, entry]) => ({
      kind,
      name,
      label: `${prefix}${name}`,
      entry,
    })),
  )
}

// The argument `maconfai trust` takes for one lock entry, ready to paste in a shell.
// MCP servers and hooks always carry their kind, so trusting them is explicit; a skill
// only does when an MCP server or hook shares its name, or when its name starts with `-`
// (runTrust would read it as a flag).
export function trustArg(kind: Kind, name: string, lock: Lock): string {
  const bare =
    kind === 'skill' &&
    !(Object.hasOwn(lock.mcpServers, name) || Object.hasOwn(lock.hooks, name)) &&
    !name.startsWith('-')
  const arg = bare ? name : `${kind}:${name}`
  return /^[\w.:@/-]+$/.test(arg) ? arg : `'${arg.replace(/'/g, `'\\''`)}'`
}

// Marks configs already in ai-lock.json as trusted, so `maconfai update` stops blocking
// them. Only the `trusted` field is written: nothing is installed, and updatedAt stays as
// it is because the content did not change.
export async function runTrust(args: string[] = []): Promise<void> {
  await setTrust(args, true)
}

// The reverse of `trust`: writes `trusted: false`, so `maconfai update` blocks the configs.
// Nothing is installed or removed.
export async function runUntrust(args: string[] = []): Promise<void> {
  await setTrust(args, false)
}

async function setTrust(args: string[], trusted: boolean): Promise<void> {
  const command = trusted ? 'trust' : 'untrust'
  const all = args.includes('--all')
  const names = args.filter((a) => !a.startsWith('-'))
  console.log()
  p.intro(pc.bgCyan(pc.black(` maconfai ${command} `)))

  const fail = (message: string) => {
    p.log.error(message)
    process.exitCode = 1
    p.outro('')
  }

  if (!all && names.length === 0) {
    return fail(
      `Name the configs to ${command} (${pc.cyan(`maconfai ${command} <name...>`)}) or pass ${pc.cyan('--all')}`,
    )
  }

  const lock = await readLock()
  const entries = lockEntries(lock)
  let selected = entries

  if (!all) {
    // Resolve every name before writing anything, so a typo never half-applies.
    // `skill:x`, `mcp:x` and `hook:x` pick one kind; a bare name must match one entry only,
    // so a skill never silently changes the MCP server or hook of the same name.
    const unknown: string[] = []
    const ambiguous: string[] = []
    const picked = new Set<(typeof entries)[number]>()
    for (const arg of names) {
      const match = /^(skill|mcp|hook):(.+)$/.exec(arg)
      const name = match ? match[2] : arg
      const found = entries.filter((e) => e.name === name && (!match || e.kind === match[1]))
      if (found.length === 0) unknown.push(arg)
      else if (found.length > 1) {
        const choices = found.map((e) => trustArg(e.kind, e.name, lock)).join(' or ')
        const kinds = found.map((e) => KIND_NAMES[e.kind]).join(' and ')
        ambiguous.push(`${arg} matches ${kinds}: use ${choices}`)
      } else picked.add(found[0]!)
    }
    if (unknown.length > 0) return fail(`Not found in ai-lock.json: ${unknown.join(', ')}`)
    if (ambiguous.length > 0) return fail(`Ambiguous name: ${ambiguous.join('; ')}`)
    selected = [...picked]
  }

  // An entry without `trusted` (installed before the field existed) is updated like a
  // trusted one, but both commands still write an explicit value: the choice then shows
  // in the lock instead of resting on that rule.
  const changed = selected.filter((s) => s.entry.trusted !== trusted)
  for (const s of changed) s.entry.trusted = trusted
  if (changed.length > 0) await writeLock(lock)

  if (selected.length === 0) {
    p.log.info(`No installed skills, MCPs, or hooks to ${command}.`)
  }
  if (changed.length > 0) {
    p.log.success(pc.green(`${trusted ? 'Trusted' : 'Untrusted'} ${changed.length} item(s)`))
    for (const s of changed) p.log.message(pc.dim(`  - ${s.label}`))
  }
  const already = selected.filter((s) => !changed.includes(s))
  if (already.length > 0) {
    const state = trusted ? 'Already trusted' : 'Already not trusted'
    p.log.info(`${state}: ${already.map((s) => s.label).join(', ')}`)
  }
  p.outro('')
}
