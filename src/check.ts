import * as p from '@clack/prompts'
import pc from 'picocolors'
import { existsSync } from 'fs'
import { join } from 'path'
import { parseSource, getOwnerRepo } from './source-parser.ts'
import { cloneRepo, cleanupTempDir, getTreeHash } from './git.ts'
import { discoverSkills } from './skills.ts'
import { installSkill } from './installer.ts'
import { readLock, addToLock, fetchSkillFolderHash, getGitHubToken } from './lock.ts'
import { agents } from './agents.ts'
import type { SkillLockEntry } from './lock.ts'
import type { AgentType } from './types.ts'

const ALL_AGENTS: AgentType[] = ['claude-code', 'cursor', 'codex', 'open-code']

function detectAgentsForSkill(skillName: string): AgentType[] {
  return ALL_AGENTS.filter((a) => existsSync(join(agents[a].skillsDir, skillName)))
}

export async function runCheck(args: string[] = [], opts: { autoUpdate?: boolean } = {}): Promise<void> {
  const skipPrompts = opts.autoUpdate || args.includes('-y') || args.includes('--yes')
  console.log()
  p.intro(pc.bgCyan(pc.black(' maconfai check ')))

  const spinner = p.spinner()
  spinner.start('Reading lock file...')

  const lock = await readLock()
  const skillNames = Object.keys(lock.skills)

  if (skillNames.length === 0) {
    spinner.stop('No skills tracked')
    p.log.info('No globally installed skills to check.')
    p.log.info(`Install skills with: ${pc.cyan('maconfai install <source> -g')}`)
    p.outro('')
    return
  }

  spinner.stop(`Found ${skillNames.length} tracked skill(s)`)

  const token = getGitHubToken()

  // Check each skill for updates
  spinner.start('Checking for updates...')

  const updates: Array<{ name: string; entry: SkillLockEntry }> = []
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

      if (latestHash !== entry.skillFolderHash) {
        updates.push({ name, entry })
      }
    } catch (err) {
      errors.push({
        name,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  spinner.stop('Check complete')
  console.log()

  if (updates.length === 0 && errors.length === 0) {
    p.log.success(pc.green('All skills are up to date'))
  }

  if (updates.length > 0) {
    p.log.info(`${updates.length} update(s) available:`)
    for (const u of updates) {
      p.log.message(`  ${pc.yellow('*')} ${u.name} ${pc.dim(`(${u.entry.source})`)}`)
    }

    if (!skipPrompts) {
      console.log()
      const confirmed = await p.confirm({
        message: `Install ${updates.length} update(s)?`,
      })

      if (p.isCancel(confirmed) || !confirmed) {
        p.log.info('Skipped updates.')
        p.outro('')
        return
      }
    }

    // Group updates by source to avoid cloning the same repo multiple times
    const updatesBySource = new Map<string, Array<{ name: string; entry: SkillLockEntry }>>()
    for (const update of updates) {
      const key = `${update.entry.sourceUrl}|${update.entry.ref || ''}`
      if (!updatesBySource.has(key)) updatesBySource.set(key, [])
      updatesBySource.get(key)!.push(update)
    }

    const updateSpinner = p.spinner()
    updateSpinner.start('Updating skills...')

    let successCount = 0
    let failCount = 0

    for (const [, sourceUpdates] of updatesBySource) {
      const { entry: firstEntry } = sourceUpdates[0]!
      const parsed = parseSource(firstEntry.sourceUrl)
      if (firstEntry.ref) parsed.ref = firstEntry.ref

      let skillsDir: string
      let tempDir: string | null = null

      try {
        if (parsed.type === 'local') {
          skillsDir = parsed.localPath!
        } else {
          tempDir = await cloneRepo(parsed.url, parsed.ref)
          skillsDir = tempDir
        }

        const discoveredSkills = await discoverSkills(skillsDir)

        for (const { name, entry } of sourceUpdates) {
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
              p.log.error(
                `Failed: ${name} -> ${agents[agent].displayName}: ${result.error}`,
              )
            }
          }

          if (skillSuccess) {
            const skillRelPath = entry.skillPath || `skills/${name}`
            let skillFolderHash = ''
            try {
              skillFolderHash = await getTreeHash(skillsDir, skillRelPath)
            } catch {}

            const ownerRepo = getOwnerRepo(parsed)
            await addToLock(name, {
              source: ownerRepo || entry.source,
              sourceUrl: entry.sourceUrl,
              skillPath: skillRelPath,
              ref: entry.ref,
              skillFolderHash,
              agents: skillAgents,
            })

            successCount++
            p.log.success(`Updated ${name}`)
          } else {
            failCount++
          }
        }
      } catch (err) {
        for (const { name } of sourceUpdates) {
          failCount++
          p.log.error(
            `Failed to update ${name}: ${err instanceof Error ? err.message : String(err)}`,
          )
        }
      } finally {
        if (tempDir) await cleanupTempDir(tempDir).catch(() => {})
      }
    }

    updateSpinner.stop('Updates complete')

    if (successCount > 0) {
      p.log.success(pc.green(`Updated ${successCount} skill(s)`))
    }
    if (failCount > 0) {
      p.log.error(pc.red(`Failed: ${failCount}`))
    }
  }

  if (skipped.length > 0) {
    console.log()
    p.log.info(pc.dim(`${skipped.length} skill(s) skipped (no version tracking)`))
    for (const s of skipped) {
      p.log.message(pc.dim(`  - ${s.name}: ${s.reason}`))
    }
  }

  if (errors.length > 0) {
    console.log()
    p.log.warn(`${errors.length} skill(s) could not be checked:`)
    for (const e of errors) {
      p.log.message(pc.dim(`  - ${e.name}: ${e.error}`))
    }
  }

  console.log()
  p.outro(pc.green('Done!'))
}
