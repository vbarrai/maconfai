import * as p from '@clack/prompts'
import pc from 'picocolors'
import { existsSync } from 'fs'
import { join } from 'path'
import { parseSource, getOwnerRepo } from './source-parser.ts'
import { cloneRepo, cleanupTempDir, getTreeHash } from './git.ts'
import {
  discoverSkills,
  discoverMcpServers,
  discoverMcpDirs,
  discoverHooks,
  discoverHookDirs,
} from './skills.ts'
import { installSkill } from './installer.ts'
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

const ALL_AGENTS: AgentType[] = ['claude-code', 'cursor', 'codex', 'open-code']

function detectAgentsForSkill(skillName: string): AgentType[] {
  return ALL_AGENTS.filter((a) => existsSync(join(agents[a].skillsDir, skillName)))
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
  console.log()
  p.intro(pc.bgCyan(pc.black(' maconfai check ')))

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
  const errors: Array<{ name: string; error: string }> = []

  for (const name of skillNames) {
    const entry = lock.skills[name]!
    if (!entry.skillFolderHash || !entry.skillPath) {
      skipped.push({ name, reason: 'No version hash' })
      continue
    }
    try {
      const latestHash = await fetchSkillFolderHash(entry.source, entry.skillPath, token, entry.ref)
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
    if (!entry.folderHash || !entry.folderPath) {
      mcpUpdates.push({ serverName, entry })
      continue
    }
    try {
      const latestHash = await fetchSkillFolderHash(
        entry.source,
        entry.folderPath,
        token,
        entry.ref,
      )
      if (latestHash && latestHash !== entry.folderHash) {
        mcpUpdates.push({ serverName, entry })
      }
    } catch {}
  }

  for (const groupName of hookNames) {
    const entry = lock.hooks[groupName]!
    if (!entry.folderHash || !entry.folderPath) {
      hookUpdates.push({ groupName, entry })
      continue
    }
    try {
      const latestHash = await fetchSkillFolderHash(
        entry.source,
        entry.folderPath,
        token,
        entry.ref,
      )
      if (latestHash && latestHash !== entry.folderHash) {
        hookUpdates.push({ groupName, entry })
      }
    } catch {}
  }

  spinner.stop('Check complete')
  console.log()

  const totalUpdates = skillUpdates.length + mcpUpdates.length + hookUpdates.length

  if (totalUpdates === 0 && errors.length === 0) {
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
      addToGroup(`${u.entry.sourceUrl}|${u.entry.ref || ''}`, { kind: 'skill', ...u })
    }
    for (const u of mcpUpdates) {
      addToGroup(`${u.entry.sourceUrl}|${u.entry.ref || ''}`, { kind: 'mcp', ...u })
    }
    for (const u of hookUpdates) {
      addToGroup(`${u.entry.sourceUrl}|${u.entry.ref || ''}`, { kind: 'hook', ...u })
    }

    const updateSpinner = p.spinner()
    updateSpinner.start('Updating...')

    let successCount = 0
    let failCount = 0

    for (const [, sourceUpdates] of updatesBySource) {
      const firstEntry = sourceUpdates[0]!.entry
      const parsed = parseSource(firstEntry.sourceUrl)
      if (firstEntry.ref) parsed.ref = firstEntry.ref

      let repoDir: string
      let tempDir: string | null = null

      try {
        if (parsed.type === 'local') {
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
                skillFolderHash = await getTreeHash(repoDir, skillRelPath)
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
              folderHash = await getTreeHash(repoDir, folderPath)
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
              folderHash = await getTreeHash(repoDir, folderPath)
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
