import * as p from '@clack/prompts'
import pc from 'picocolors'
import { existsSync } from 'fs'
import { dirname, join } from 'path'
import { parseSource, getOwnerRepo } from './source-parser.ts'
import { guardHomeDir } from './home-dir.ts'
import { cloneRepo, cleanupTempDir, getLocalTreeHash, getTreeHash } from './git.ts'
import {
  discoverSkills,
  discoverMcpServers,
  discoverMcpDirs,
  discoverHooks,
  discoverHookDirs,
} from './skills.ts'
import { installSkill, sanitizeName } from './installer.ts'
import { installMcpServers } from './mcp.ts'
import { installHooks, installHookFiles } from './hooks.ts'
import {
  readLock,
  addToLock,
  addMcpToLock,
  addHookToLock,
  fetchSkillFolderHash,
  getGitHubToken,
} from './lock.ts'
import type { SkillLockEntry, McpLockEntry, HookLockEntry } from './lock.ts'
import type { AgentType, HookGroup } from './types.ts'
import { agents, detectProjectAgents } from './agents.ts'
import { trustArg } from './trust.ts'

const ALL_AGENTS: AgentType[] = ['claude-code', 'cursor', 'codex', 'open-code']

// The lock records handlers for an agent whose hooks config is absent: a version without hooks
// support for that agent (Codex before .codex/hooks.json) recorded them without writing
// anything. The folder hash is then current, so only this check gets the file written.
function hasMissingHooksConfig(entry: HookLockEntry): boolean {
  return Object.keys(entry.handlers ?? {}).some((a) => {
    const path = Object.hasOwn(agents, a) ? agents[a as AgentType].hooksConfigPath : undefined
    return path !== undefined && !existsSync(path)
  })
}

const knownAgents = (names: string[] | undefined): AgentType[] =>
  (names ?? []).filter((a): a is AgentType => Object.hasOwn(agents, a))

// A tracked skill whose link or copy is gone from an agent's skills dir (a broken symlink
// counts as gone). The hash cannot see this, so only this check gets it restored. An agent
// whose skills dir is absent altogether (gitignored, not in this checkout) is not "missing":
// restoring it would reinstall on every run of a fresh clone.
function hasMissingSkillFiles(name: string, entry: SkillLockEntry): boolean {
  return knownAgents(entry.agents).some((a) => {
    const skillsDir = agents[a].skillsDir
    return existsSync(skillsDir) && !existsSync(join(skillsDir, sanitizeName(name)))
  })
}

// Same for an MCP server: an agent the lock targets has no MCP config file, though the
// directory that holds it is there.
function hasMissingMcpConfig(entry: McpLockEntry): boolean {
  return knownAgents(entry.agents).some((a) => {
    const path = agents[a].mcpConfigPath
    return path !== undefined && existsSync(dirname(path)) && !existsSync(path)
  })
}

// A local source recorded on another machine (a committed lock, CI): only its author can
// update it, so it is skipped and reported, never counted as a failure.
function isAbsentLocalSource(entry: { source: string; sourceUrl?: string }): boolean {
  const localDir = localSourceDir(entry)
  return localDir !== undefined && !existsSync(localDir)
}

// Where to fetch an entry from. An old or hand-edited lock may lack `sourceUrl`: fall back
// to `source` (owner/repo, or the path a local install was given) rather than crash.
function entrySourceUrl(entry: { source: string; sourceUrl?: string }): string {
  return entry.sourceUrl || entry.source
}

// The local directory a lock entry was installed from, if it came from one.
function localSourceDir(entry: { source: string; sourceUrl?: string }): string | undefined {
  const parsed = parseSource(entrySourceUrl(entry))
  return parsed.type === 'local' ? parsed.localPath : undefined
}

function isLocalSource(entry: { source: string; sourceUrl?: string }): boolean {
  return localSourceDir(entry) !== undefined
}

// GitHub knows nothing of a local source: hash its files on disk, as install copies them.
async function fetchLatestHash(
  entry: { source: string; sourceUrl: string; ref?: string },
  folderPath: string,
  token: string | null,
): Promise<string | null> {
  const localDir = localSourceDir(entry)
  if (localDir) return sourceFolderHash(true, localDir, folderPath)
  return fetchSkillFolderHash(entry.source, folderPath, token, entry.ref)
}

// The hash recorded after an update: from the files of a local source (a skill path naming
// its SKILL.md stands for the folder, as on GitHub), from the clone otherwise.
function sourceFolderHash(isLocal: boolean, dir: string, folderPath: string): Promise<string> {
  if (!isLocal) return getTreeHash(dir, folderPath)
  return getLocalTreeHash(dir, folderPath.replace(/(^|\/)SKILL\.md$/, ''))
}

// Skills are installed under their sanitized name, while the lock is keyed by the raw name.
function detectAgentsForSkill(skillName: string): AgentType[] {
  const dirName = sanitizeName(skillName)
  return ALL_AGENTS.filter((a) => existsSync(join(agents[a].skillsDir, dirName)))
}

type AnyUpdate =
  | { kind: 'skill'; name: string; entry: SkillLockEntry }
  | { kind: 'mcp'; serverName: string; entry: McpLockEntry }
  | { kind: 'hook'; groupName: string; entry: HookLockEntry }

export async function runCheck(
  args: string[] = [],
  opts: { autoUpdate?: boolean } = {},
): Promise<void> {
  const skipPrompts = opts.autoUpdate || args.includes('-y') || args.includes('--yes')
  // --include-untrusted ignores the trust gate and updates every config, trusted or not
  const includeUntrusted = args.includes('--include-untrusted')
  console.log()
  p.intro(pc.bgCyan(pc.black(' maconfai check ')))
  // Without a terminal (CI, cron) nobody can confirm, so check/update refuse to run in $HOME.
  await guardHomeDir(
    Boolean(process.stdin.isTTY),
    `Run maconfai ${opts.autoUpdate ? 'update' : 'check'} from a project, or from a terminal to confirm.`,
  )

  const spinner = p.spinner()
  spinner.start('Reading lock file...')

  const lock = await readLock()
  const skillNames = Object.keys(lock.skills)
  const mcpNames = Object.keys(lock.mcpServers)
  const hookNames = Object.keys(lock.hooks)
  const totalTracked = skillNames.length + mcpNames.length + hookNames.length

  if (totalTracked === 0) {
    spinner.stop('Nothing tracked')
    p.log.info('No installed configurations to check.')
    p.log.info(`Install with: ${pc.cyan('maconfai install <source>')}`)
    p.outro('')
    return
  }

  const parts: string[] = []
  if (skillNames.length > 0) parts.push(`${skillNames.length} skill(s)`)
  if (mcpNames.length > 0) parts.push(`${mcpNames.length} MCP(s)`)
  if (hookNames.length > 0) parts.push(`${hookNames.length} hook(s)`)
  spinner.stop(`Found ${parts.join(' + ')} tracked`)

  const token = getGitHubToken()

  spinner.start('Checking for updates...')

  const skillUpdates: Array<{ name: string; entry: SkillLockEntry }> = []
  const mcpUpdates: Array<{ serverName: string; entry: McpLockEntry }> = []
  const hookUpdates: Array<{ groupName: string; entry: HookLockEntry }> = []
  const skipped: Array<{ name: string; reason: string }> = []
  // label is what the report shows; arg is what `maconfai trust` takes
  const blocked: Array<{ label: string; arg: string }> = []
  const absent: Array<{ name: string; source: string }> = []
  const errors: Array<{ name: string; error: string }> = []

  // A config is gated unless it is trusted. Missing trusted (grandfathered entries
  // installed before the field existed) counts as trusted.
  const isBlocked = (entry: { trusted?: boolean }) => !includeUntrusted && entry.trusted === false

  for (const name of skillNames) {
    const entry = lock.skills[name]!
    if (isBlocked(entry)) {
      blocked.push({ label: name, arg: trustArg('skill', name, lock) })
      continue
    }
    if (isAbsentLocalSource(entry)) {
      absent.push({ name, source: entrySourceUrl(entry) })
      continue
    }
    if (hasMissingSkillFiles(name, entry)) {
      skillUpdates.push({ name, entry })
      continue
    }
    // An empty hash from a local source only means install could not hash it: compare anyway.
    if (!entry.skillPath || (!entry.skillFolderHash && !isLocalSource(entry))) {
      skipped.push({ name, reason: 'No version hash' })
      continue
    }
    try {
      const latestHash = await fetchLatestHash(entry, entry.skillPath, token)
      if (!latestHash) {
        errors.push({ name, error: 'Could not fetch from GitHub' })
        continue
      }
      if (latestHash !== entry.skillFolderHash) skillUpdates.push({ name, entry })
    } catch (err) {
      errors.push({ name, error: err instanceof Error ? err.message : 'Unknown error' })
    }
  }

  for (const serverName of mcpNames) {
    const entry = lock.mcpServers[serverName]!
    if (isBlocked(entry)) {
      blocked.push({ label: `MCP: ${serverName}`, arg: trustArg('mcp', serverName, lock) })
      continue
    }
    if (isAbsentLocalSource(entry)) {
      absent.push({ name: `MCP: ${serverName}`, source: entrySourceUrl(entry) })
      continue
    }
    if (
      !entry.folderPath ||
      (!entry.folderHash && !isLocalSource(entry)) ||
      hasMissingMcpConfig(entry)
    ) {
      mcpUpdates.push({ serverName, entry })
      continue
    }
    try {
      const latestHash = await fetchLatestHash(entry, entry.folderPath, token)
      if (latestHash && latestHash !== entry.folderHash) {
        mcpUpdates.push({ serverName, entry })
      }
    } catch {}
  }

  for (const groupName of hookNames) {
    const entry = lock.hooks[groupName]!
    if (isBlocked(entry)) {
      blocked.push({ label: `hook: ${groupName}`, arg: trustArg('hook', groupName, lock) })
      continue
    }
    if (isAbsentLocalSource(entry)) {
      absent.push({ name: `hook: ${groupName}`, source: entrySourceUrl(entry) })
      continue
    }
    if (
      !entry.folderPath ||
      (!entry.folderHash && !isLocalSource(entry)) ||
      hasMissingHooksConfig(entry)
    ) {
      hookUpdates.push({ groupName, entry })
      continue
    }
    try {
      const latestHash = await fetchLatestHash(entry, entry.folderPath, token)
      if (latestHash && latestHash !== entry.folderHash) {
        hookUpdates.push({ groupName, entry })
      }
    } catch {}
  }

  spinner.stop('Check complete')
  console.log()

  const totalUpdates = skillUpdates.length + mcpUpdates.length + hookUpdates.length

  if (totalUpdates === 0 && errors.length === 0 && blocked.length === 0 && absent.length === 0) {
    p.log.success(pc.green('All skills, MCPs, and hooks are up to date'))
  }

  if (totalUpdates > 0) {
    p.log.info(`${totalUpdates} update(s) available:`)
    for (const u of skillUpdates) {
      p.log.message(`  ${pc.yellow('*')} ${u.name} ${pc.dim(`(${u.entry.source})`)}`)
    }
    for (const u of mcpUpdates) {
      p.log.message(`  ${pc.yellow('*')} MCP: ${u.serverName} ${pc.dim(`(${u.entry.source})`)}`)
    }
    for (const u of hookUpdates) {
      p.log.message(`  ${pc.yellow('*')} hook: ${u.groupName} ${pc.dim(`(${u.entry.source})`)}`)
    }

    if (!skipPrompts) {
      console.log()
      const confirmed = await p.confirm({
        message: `Install ${totalUpdates} update(s)?`,
      })
      if (p.isCancel(confirmed) || !confirmed) {
        p.log.info('Skipped updates.')
        p.outro('')
        return
      }
    }

    // Group all updates by source — single clone per repo
    const updatesBySource = new Map<string, AnyUpdate[]>()

    const addToGroup = (key: string, item: AnyUpdate) => {
      if (!updatesBySource.has(key)) updatesBySource.set(key, [])
      updatesBySource.get(key)!.push(item)
    }

    for (const u of skillUpdates) {
      addToGroup(`${entrySourceUrl(u.entry)}|${u.entry.ref || ''}`, { kind: 'skill', ...u })
    }
    for (const u of mcpUpdates) {
      addToGroup(`${entrySourceUrl(u.entry)}|${u.entry.ref || ''}`, { kind: 'mcp', ...u })
    }
    for (const u of hookUpdates) {
      addToGroup(`${entrySourceUrl(u.entry)}|${u.entry.ref || ''}`, { kind: 'hook', ...u })
    }

    const updateSpinner = p.spinner()
    updateSpinner.start('Updating...')

    let successCount = 0
    let failCount = 0

    for (const [, sourceUpdates] of updatesBySource) {
      const firstEntry = sourceUpdates[0]!.entry
      const parsed = parseSource(entrySourceUrl(firstEntry))
      if (firstEntry.ref) parsed.ref = firstEntry.ref

      let repoDir: string
      let tempDir: string | null = null
      const isLocal = parsed.type === 'local'

      try {
        if (isLocal) {
          repoDir = parsed.localPath!
        } else {
          tempDir = await cloneRepo(parsed.url, parsed.ref)
          repoDir = tempDir
        }

        const discoveredSkills = await discoverSkills(repoDir)
        const rootMcps = await discoverMcpServers(repoDir)
        const dirMcps = await discoverMcpDirs(repoDir)
        const rootHooks = await discoverHooks(repoDir)
        const dirHooks = await discoverHookDirs(repoDir)

        const ownerRepo = getOwnerRepo(parsed)
        const projectAgents = detectProjectAgents()
        const fallbackAgents = projectAgents.length > 0 ? projectAgents : ALL_AGENTS

        for (const update of sourceUpdates) {
          if (update.kind === 'skill') {
            const { name, entry } = update
            const skill = discoveredSkills.find((s) => s.name === name)
            if (!skill) {
              failCount++
              p.log.error(`Skill ${name} not found in source`)
              continue
            }

            const skillAgents = (
              entry.agents?.length ? entry.agents : detectAgentsForSkill(name)
            ) as AgentType[]
            if (skillAgents.length === 0) {
              p.log.error(
                `Skill ${name}: no agent recorded in ai-lock.json and none found on disk — reinstall it with --agents`,
              )
            }

            let skillSuccess = false
            for (const agent of skillAgents) {
              const result = await installSkill(skill, agent, { global: false })
              if (result.success) {
                skillSuccess = true
              } else {
                p.log.error(`Failed: ${name} -> ${agents[agent].displayName}: ${result.error}`)
              }
            }

            if (skillSuccess) {
              const skillRelPath = entry.skillPath || `skills/${name}`
              let skillFolderHash = ''
              try {
                skillFolderHash = await sourceFolderHash(isLocal, repoDir, skillRelPath)
              } catch {}

              await addToLock(name, {
                source: ownerRepo || entry.source,
                sourceUrl: entry.sourceUrl,
                skillPath: skillRelPath,
                ref: entry.ref,
                skillFolderHash,
                agents: skillAgents,
              })

              successCount++
              p.log.success(`Updated skill: ${name}`)
            } else {
              failCount++
            }
          } else if (update.kind === 'mcp') {
            const { serverName, entry } = update
            const mcpConfig = rootMcps[serverName] ?? dirMcps[serverName]
            if (!mcpConfig) {
              failCount++
              p.log.error(`MCP server ${serverName} not found in source`)
              continue
            }

            const targetAgents = (entry.agents as AgentType[] | undefined)?.length
              ? (entry.agents as AgentType[])
              : fallbackAgents
            for (const agent of targetAgents) {
              await installMcpServers({ [serverName]: mcpConfig }, agent, {
                ownedNames: new Set([serverName]),
              })
            }

            const isFromDir = dirMcps[serverName] !== undefined
            const folderPath = entry.folderPath ?? (isFromDir ? `mcps/${serverName}` : serverName)
            let folderHash = ''
            try {
              folderHash = await sourceFolderHash(isLocal, repoDir, folderPath)
            } catch {}

            await addMcpToLock(serverName, {
              source: ownerRepo || entry.source,
              sourceUrl: entry.sourceUrl,
              ref: entry.ref,
              folderPath,
              folderHash,
              agents: targetAgents,
            })

            successCount++
            p.log.success(`Updated MCP: ${serverName}`)
          } else {
            const { groupName, entry } = update
            const rootGroup = rootHooks[groupName]
            const dirEntry = dirHooks[groupName]
            const hookGroup = rootGroup ?? dirEntry?.group
            if (!hookGroup) {
              failCount++
              p.log.error(`Hook group ${groupName} not found in source`)
              continue
            }

            if (dirEntry?.dirPath) {
              await installHookFiles(dirEntry.dirPath, groupName)
            }

            const targetAgents = (entry.agents as AgentType[] | undefined)?.length
              ? (entry.agents as AgentType[])
              : fallbackAgents
            for (const agent of targetAgents) {
              const agentKey = agent as keyof HookGroup
              const hookEvents = hookGroup[agentKey]
              if (hookEvents && typeof hookEvents === 'object' && !Array.isArray(hookEvents)) {
                await installHooks(hookEvents as Record<string, unknown[]>, agent, { force: true })
              }
            }

            const isFromDir = dirHooks[groupName] !== undefined
            const folderPath = entry.folderPath ?? (isFromDir ? `hooks/${groupName}` : groupName)
            let folderHash = ''
            try {
              folderHash = await sourceFolderHash(isLocal, repoDir, folderPath)
            } catch {}

            await addHookToLock(groupName, {
              source: ownerRepo || entry.source,
              sourceUrl: entry.sourceUrl,
              ref: entry.ref,
              folderPath,
              folderHash,
              agents: targetAgents,
            })

            successCount++
            p.log.success(`Updated hook: ${groupName}`)
          }
        }
      } catch (err) {
        for (const update of sourceUpdates) {
          const label =
            update.kind === 'skill'
              ? update.name
              : update.kind === 'mcp'
                ? `MCP: ${update.serverName}`
                : `hook: ${update.groupName}`
          failCount++
          p.log.error(
            `Failed to update ${label}: ${err instanceof Error ? err.message : String(err)}`,
          )
        }
      } finally {
        if (tempDir) await cleanupTempDir(tempDir).catch(() => {})
      }
    }

    updateSpinner.stop('Updates complete')

    if (successCount > 0) {
      p.log.success(pc.green(`Updated ${successCount} item(s)`))
    }
    if (failCount > 0) {
      p.log.error(pc.red(`Failed: ${failCount}`))
    }
  }

  if (blocked.length > 0) {
    console.log()
    p.log.warn(`${blocked.length} item(s) blocked (not trusted):`)
    for (const b of blocked) {
      p.log.message(pc.dim(`  - ${b.label}`))
    }
    // --include-untrusted only bypasses the gate for one run; trust is what keeps them updating
    const names = blocked.map((b) => b.arg).join(' ')
    p.log.info(`To keep them updating, run: ${pc.cyan(`maconfai trust ${names}`)}`)
    p.log.info(`To update them once: ${pc.cyan('maconfai update --include-untrusted')}`)
  }

  if (absent.length > 0) {
    console.log()
    p.log.warn(`${absent.length} item(s) skipped — local source not found on this machine`)
    for (const a of absent) {
      p.log.message(pc.dim(`  - ${a.name} (${a.source})`))
    }
  }

  if (skipped.length > 0) {
    console.log()
    p.log.info(pc.dim(`${skipped.length} item(s) skipped (no version tracking)`))
    for (const s of skipped) {
      p.log.message(pc.dim(`  - ${s.name}: ${s.reason}`))
    }
  }

  if (errors.length > 0) {
    console.log()
    p.log.warn(`${errors.length} item(s) could not be checked:`)
    for (const e of errors) {
      p.log.message(pc.dim(`  - ${e.name}: ${e.error}`))
    }
  }

  console.log()
  p.outro(pc.green('Done!'))
}
