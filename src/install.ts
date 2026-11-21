import * as p from '@clack/prompts'
import pc from 'picocolors'
import { existsSync } from 'fs'
import { join, relative } from 'path'
import { parseSource } from './source-parser.ts'
import { guardHomeDir } from './home-dir.ts'
import { cloneRepo, cleanupTempDir, getTreeHash } from './git.ts'
import {
  discoverSkills,
  discoverMcpServers,
  discoverMcpDirs,
  discoverHooks,
  discoverHookDirs,
} from './skills.ts'
import {
  installSkill,
  uninstallSkill,
  listInstalledSkills,
  findUnmanagedSkillPaths,
} from './installer.ts'
import { agents, detectInstalledAgents, detectProjectAgents } from './agents.ts'
import {
  readLock,
  addToLock,
  addMcpToLock,
  addHookToLock,
  removeFromLock,
  removeMcpFromLock,
  removeHookFromLock,
} from './lock.ts'
import { getOwnerRepo, repoRelativePath } from './source-parser.ts'
import { installMcpServers, uninstallMcpServers, listInstalledMcpServerNames } from './mcp.ts'
import { installHooks, installHookFiles, uninstallHooks } from './hooks.ts'
import type { Skill, AgentType, McpServerConfig, HookGroup } from './types.ts'

const ALL_AGENTS: AgentType[] = ['claude-code', 'cursor', 'codex', 'open-code']

const AGENT_ALIASES: Record<string, AgentType> = {
  'claude-code': 'claude-code',
  claude: 'claude-code',
  cursor: 'cursor',
  codex: 'codex',
  'open-code': 'open-code',
  opencode: 'open-code',
}

function parseListArg(args: string[], name: string): string[] | undefined {
  const prefix = `--${name}=`
  const arg = args.find((a) => a.startsWith(prefix))
  if (!arg) return undefined
  return arg
    .slice(prefix.length)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

// Resolve the trust value written to the lock for a single config.
// - runChoice set (via --trusted or the interactive prompt) → use it for every config
// - runChoice undefined (e.g. -y without --trusted) → preserve an existing config's trust,
//   default brand-new configs to non-trusted
function resolveTrust(
  runChoice: boolean | undefined,
  existing: { trusted?: boolean } | undefined,
): boolean {
  if (runChoice !== undefined) return runChoice
  return existing?.trusted ?? false
}

function parseAgentsArg(args: string[]): AgentType[] | undefined {
  const raw = parseListArg(args, 'agents')
  if (!raw) return undefined
  return raw.map((a) => {
    const resolved = AGENT_ALIASES[a.toLowerCase()]
    if (!resolved)
      throw new Error(`Unknown agent: ${a}. Valid: ${Object.keys(AGENT_ALIASES).join(', ')}`)
    return resolved
  })
}

export async function runInstall(args: string[]): Promise<void> {
  const skipPrompts = args.includes('-y') || args.includes('--yes')
  await guardHomeDir(!skipPrompts, 'Run maconfai from a project, or without -y to confirm.')
  if (args.length === 0) {
    // No source = interactive uninstall mode
    await runUninstall()
    return
  }

  const source = args.find((a) => !a.startsWith('-'))!
  const argAgents = parseAgentsArg(args)
  const argSkills = parseListArg(args, 'skills')
  const argMcps = parseListArg(args, 'mcps')
  const argHooks = parseListArg(args, 'hooks')
  const argBranch = parseListArg(args, 'branch')?.[0]
  // --force replaces a same-named skill that ai-lock.json does not list (written by hand).
  const force = args.includes('--force')
  // --trusted marks every config installed in this run as trusted (blind auto-update).
  // Run-level choice: true via flag, set by the interactive prompt, or undefined (per-config default).
  let trustChoice: boolean | undefined = args.includes('--trusted') ? true : undefined

  console.log()
  p.intro(pc.bgCyan(pc.black(' maconfai install ')))

  const spinner = p.spinner()
  let tempDir: string | null = null
  const refTempDirs: string[] = []

  try {
    // Parse source
    spinner.start('Parsing source...')
    const parsed = parseSource(source)
    // --branch flag overrides any ref from the source
    if (argBranch) parsed.ref = argBranch
    spinner.stop(
      `Source: ${parsed.type === 'local' ? parsed.localPath! : parsed.url}${parsed.ref ? ` (${parsed.ref})` : ''}`,
    )

    // Resolve skills directory
    let skillsDir: string

    if (parsed.type === 'local') {
      if (!existsSync(parsed.localPath!)) {
        p.log.error(pc.red(`Path not found: ${parsed.localPath}`))
        process.exit(1)
      }
      skillsDir = parsed.subpath ? join(parsed.localPath!, parsed.subpath) : parsed.localPath!
    } else {
      spinner.start('Cloning repository...')
      tempDir = await cloneRepo(parsed.url, parsed.ref)
      skillsDir = parsed.subpath ? join(tempDir, parsed.subpath) : tempDir
      spinner.stop('Repository cloned')
    }

    // Discover skills, MCP servers, and hooks
    spinner.start('Discovering skills, MCP servers, and hooks...')
    let skills = await discoverSkills(skillsDir)
    const rootMcpServers = await discoverMcpServers(skillsDir)
    const dirMcpServers = await discoverMcpDirs(skillsDir)
    const rootHooks = await discoverHooks(skillsDir)
    const dirHooks = await discoverHookDirs(skillsDir)
    const hasRootMcp = Object.keys(rootMcpServers).length > 0
    const hasDirMcps = Object.keys(dirMcpServers).length > 0
    const hasRootHooks = Object.keys(rootHooks).length > 0
    const hasDirHooks = Object.keys(dirHooks).length > 0

    if (skills.length === 0 && !hasRootMcp && !hasDirMcps && !hasRootHooks && !hasDirHooks) {
      spinner.stop(pc.red('Nothing found'))
      p.log.error('No skills, MCP servers, or hooks found.')
      await cleanup(tempDir)
      process.exit(1)
    }

    const parts: string[] = []
    if (skills.length > 0) parts.push(`${skills.length} skill(s)`)
    const totalMcpCount = Object.keys(rootMcpServers).length + Object.keys(dirMcpServers).length
    if (totalMcpCount > 0) parts.push(`${totalMcpCount} MCP server(s)`)
    const totalHookCount = Object.keys(rootHooks).length + Object.keys(dirHooks).length
    if (totalHookCount > 0) parts.push(`${totalHookCount} hook(s)`)
    spinner.stop(`Found ${pc.green(parts.join(' + '))}`)

    // Types shared between remote ref resolution and the main MCP/hook collection
    interface McpEntry {
      serverName: string
      source: string
      config: McpServerConfig
    }
    interface HookEntry {
      groupName: string
      source: string
      group: HookGroup
      dirPath?: string
    }

    // Extras collected from remote refs (injected into the main MCP/hook lists below)
    const remoteMcpExtras: McpEntry[] = []
    const remoteHookExtras: HookEntry[] = []

    // Resolve remote skill references (extensionless files in skills/ containing a source string)
    interface SkillCtx {
      repoDir: string
      skillRelPath: string
      source: string
      sourceUrl: string
      ref?: string
    }
    const skillCtxMap = new Map<string, SkillCtx>()

    if (skills.some((s) => s.remoteRef)) {
      spinner.start('Resolving remote skill references...')
      const resolved: typeof skills = []
      for (const skill of skills) {
        if (!skill.remoteRef) {
          resolved.push(skill)
          continue
        }
        const remoteRef = skill.remoteRef
        const refParsed = parseSource(remoteRef.source)
        let refTempDir: string | null = null
        let refBase: string
        if (refParsed.type === 'local') {
          refBase = refParsed.localPath!
        } else {
          refTempDir = await cloneRepo(refParsed.url, refParsed.ref)
          refTempDirs.push(refTempDir)
          refBase = refTempDir
        }
        const refSkillsDir = refParsed.subpath ? join(refBase, refParsed.subpath) : refBase
        const include = remoteRef.include ?? ['skills']

        // Resolve skill
        if (include.includes('skills')) {
          const refDiscovered = await discoverSkills(refSkillsDir)
          const match = refDiscovered.find((s) => s.name === skill.name) ?? refDiscovered[0]
          if (match?.remoteRef) {
            p.log.warn(
              `Skipping remote ref "${skill.name}": circular reference detected (${remoteRef.source} → ${match.remoteRef.source})`,
            )
          } else if (match) {
            const finalSkill = remoteRef.prefix
              ? {
                  ...match,
                  name: `${remoteRef.prefix}-${match.name}`,
                  rawContent: match.rawContent?.replace(
                    /^(name:\s*)\S+/m,
                    `$1${remoteRef.prefix}-${match.name}`,
                  ),
                }
              : match
            resolved.push(finalSkill)
            const refOwnerRepo = getOwnerRepo(refParsed)
            skillCtxMap.set(finalSkill.name, {
              repoDir: refBase,
              skillRelPath: relative(refBase, match.path),
              source: refOwnerRepo ?? remoteRef.source,
              sourceUrl: refParsed.type === 'local' ? refParsed.localPath! : refParsed.url,
              ref: refParsed.ref,
            })
          } else {
            p.log.warn(`Could not resolve remote skill reference: ${remoteRef.source}`)
          }
        }

        // Collect MCPs from remote
        if (include.includes('mcps')) {
          const refMcps = {
            ...(await discoverMcpServers(refSkillsDir)),
            ...(await discoverMcpDirs(refSkillsDir)),
          }
          for (const [serverName, config] of Object.entries(refMcps)) {
            const key = remoteRef.prefix ? `${remoteRef.prefix}-${serverName}` : serverName
            remoteMcpExtras.push({ serverName: key, source: `ref:${skill.name}`, config })
          }
        }

        // Collect hooks from remote
        if (include.includes('hooks')) {
          const refHooks = await discoverHooks(refSkillsDir)
          for (const [groupName, group] of Object.entries(refHooks)) {
            const key = remoteRef.prefix ? `${remoteRef.prefix}-${groupName}` : groupName
            remoteHookExtras.push({ groupName: key, source: `ref:${skill.name}`, group })
          }
          const refHookDirs = await discoverHookDirs(refSkillsDir)
          for (const [groupName, { group, dirPath }] of Object.entries(refHookDirs)) {
            const key = remoteRef.prefix ? `${remoteRef.prefix}-${groupName}` : groupName
            remoteHookExtras.push({ groupName: key, source: `ref:${skill.name}`, group, dirPath })
          }
        }
      }
      skills = resolved
      spinner.stop(`Resolved ${skillCtxMap.size} remote reference(s)`)
    }

    // Check which skills are already installed
    const installed = await listInstalledSkills({ global: false })
    // Only skills the lock records are ours: a hand-written one is never pre-checked nor removed.
    const startLock = await readLock()
    const installedNames = new Set(
      installed.map((s) => s.name).filter((name) => Object.hasOwn(startLock.skills, name)),
    )

    // With -y, a --skills/--mcps/--hooks list that names something means "only what is named":
    // every MCP server and hook is selected only when none does. An empty list (`--mcps=`)
    // only turns its own category off.
    const hasContentFilter = Boolean(argSkills?.length || argMcps?.length || argHooks?.length)
    // A category given no list in such a run is left as it is: nothing installed, nothing
    // removed. `--mcps=x -y` keeps the installed skills and hooks, `--skills=a -y` keeps the
    // installed MCP servers and hooks.
    const skillsUntouched = skipPrompts && !argSkills && hasContentFilter
    const mcpsUntouched = skipPrompts && !argMcps && hasContentFilter
    const hooksUntouched = skipPrompts && !argHooks && hasContentFilter

    // Select skills (installed ones are pre-checked)
    let selectedSkills: Skill[]
    let allSkills = skills

    if (skills.length === 0) {
      selectedSkills = []
    } else if (argSkills) {
      selectedSkills = skills.filter((s) => argSkills.includes(s.name))
    } else if (skillsUntouched) {
      selectedSkills = []
    } else if (skills.length === 1 || skipPrompts) {
      selectedSkills = skills
    } else {
      const choices = skills.map((s) => ({
        value: s,
        label: s.name,
        hint: s.description,
      }))

      const initialValues = skills.filter((s) => installedNames.has(s.name))

      const selected = await p.multiselect({
        message: `Select skills ${pc.dim('(space to toggle, uncheck to remove)')}`,
        options: choices as any,
        initialValues: initialValues as any,
        required: false,
      })

      if (p.isCancel(selected)) {
        p.cancel('Cancelled')
        await cleanup(tempDir)
        process.exit(0)
      }

      selectedSkills = selected as Skill[]
    }

    // Collect MCP servers from root mcp.json + mcps/ directories + remote refs
    const allMcpEntries: McpEntry[] = []
    for (const [serverName, config] of Object.entries(rootMcpServers)) {
      allMcpEntries.push({ serverName, source: 'mcp.json', config })
    }
    for (const [serverName, config] of Object.entries(dirMcpServers)) {
      allMcpEntries.push({ serverName, source: `mcps/${serverName}`, config })
    }
    allMcpEntries.push(...remoteMcpExtras)

    // Select MCP servers
    let selectedMcpNames: Set<string> = new Set()

    if (allMcpEntries.length > 0) {
      if (argMcps) {
        selectedMcpNames = new Set(argMcps)
      } else if (skipPrompts) {
        if (!mcpsUntouched) {
          selectedMcpNames = new Set(allMcpEntries.map((e) => e.serverName))
        }
      } else {
        const installedMcpNames = await listInstalledMcpServerNames()

        const mcpChoices = allMcpEntries.map((e) => ({
          value: e.serverName,
          label: e.serverName,
        }))

        const initialMcpValues = allMcpEntries
          .filter((e) => installedMcpNames.has(e.serverName))
          .map((e) => e.serverName)

        const selectedMcp = await p.multiselect({
          message: `Select MCP servers to install ${pc.dim('(space to toggle)')}`,
          options: mcpChoices as any,
          initialValues: initialMcpValues,
          required: false,
        })

        if (p.isCancel(selectedMcp)) {
          p.cancel('Cancelled')
          await cleanup(tempDir)
          process.exit(0)
        }

        selectedMcpNames = new Set(selectedMcp as string[])
      }
    }

    // Collect hook groups from root hooks.json + hooks/ directories + remote refs
    const allHookEntries: HookEntry[] = []
    for (const [groupName, group] of Object.entries(rootHooks)) {
      allHookEntries.push({ groupName, source: 'hooks.json', group })
    }
    for (const [groupName, { group, dirPath }] of Object.entries(dirHooks)) {
      allHookEntries.push({ groupName, source: `hooks/${groupName}`, group, dirPath })
    }
    allHookEntries.push(...remoteHookExtras)

    // Select hooks
    let selectedHookNames: Set<string> = new Set()

    if (allHookEntries.length > 0) {
      if (argHooks) {
        selectedHookNames = new Set(argHooks)
      } else if (skipPrompts) {
        if (!hooksUntouched) {
          selectedHookNames = new Set(allHookEntries.map((e) => e.groupName))
        }
      } else {
        const hookChoices = allHookEntries.map((e) => ({
          value: e.groupName,
          label: `${e.groupName}${e.group.description ? ` ${pc.dim(`— ${e.group.description}`)}` : ''}`,
        }))

        const lock = await readLock()
        const installedHookNames = new Set(Object.keys(lock.hooks))
        const initialHookValues = allHookEntries
          .filter((e) => installedHookNames.has(e.groupName))
          .map((e) => e.groupName)

        const selectedHook = await p.multiselect({
          message: `Select hooks to install ${pc.dim('(space to toggle)')}`,
          options: hookChoices as any,
          initialValues: initialHookValues,
          required: false,
        })

        if (p.isCancel(selectedHook)) {
          p.cancel('Cancelled')
          await cleanup(tempDir)
          process.exit(0)
        }

        selectedHookNames = new Set(selectedHook as string[])
      }
    }

    // Say what a filtered -y run left out, so a script that relied on "-y installs everything"
    // does not lose an MCP server or hook silently. What is already installed is kept, not skipped.
    if (skipPrompts && hasContentFilter) {
      const skipped: string[] = []
      const skippedMcps = allMcpEntries.filter(
        (e) =>
          !selectedMcpNames.has(e.serverName) && !Object.hasOwn(startLock.mcpServers, e.serverName),
      )
      if (skippedMcps.length > 0) skipped.push(`${skippedMcps.length} MCP server(s)`)
      const skippedHooks = allHookEntries.filter(
        (e) => !selectedHookNames.has(e.groupName) && !Object.hasOwn(startLock.hooks, e.groupName),
      )
      if (skippedHooks.length > 0) skipped.push(`${skippedHooks.length} hook(s)`)
      if (skipped.length > 0) {
        p.log.info(
          `Skipped ${skipped.join(' and ')} not named in --mcps/--hooks ${pc.dim('(name them to install them)')}`,
        )
      }
    }

    // Determine which agents previously had configs installed (skills, MCPs, or hooks)
    const previousAgents = new Set<AgentType>()
    for (const s of installed) {
      for (const a of s.agents) previousAgents.add(a)
    }
    // Also check agent config files in the project
    for (const a of ALL_AGENTS) {
      const agent = agents[a]
      if (agent.mcpConfigPath && existsSync(agent.mcpConfigPath)) previousAgents.add(a)
      if (agent.hooksConfigPath && existsSync(agent.hooksConfigPath)) previousAgents.add(a)
    }

    // And the agents the lock records, so a project keeps its targets whoever runs the install
    const lockEntries = [
      ...Object.values(startLock.skills),
      ...Object.values(startLock.mcpServers),
      ...Object.values(startLock.hooks),
    ]
    for (const entry of lockEntries) {
      for (const a of entry.agents ?? []) {
        if (ALL_AGENTS.includes(a as AgentType)) previousAgents.add(a as AgentType)
      }
    }
    // Only a first install looks at $HOME (~/.claude, ~/.cursor, ~/.codex…) to pick agents:
    // afterwards the targets come from the project alone, so they do not depend on who runs it.
    // The lock decides: hand-written skills on disk do not make a project set up.
    const firstInstall = lockEntries.length === 0
    const detectAgents = () => (firstInstall ? detectInstalledAgents() : detectProjectAgents())

    // Select agents
    let targetAgents: AgentType[]
    let removedAgents: AgentType[] = []

    if (argAgents) {
      targetAgents = argAgents
    } else if (skipPrompts) {
      const detected = detectAgents()
      const combined = new Set([...detected, ...previousAgents])
      targetAgents = combined.size > 0 ? [...combined] : ALL_AGENTS
    } else {
      const detected = detectAgents()
      // Pre-check agents that have any config installed. A set-up project pre-checks every
      // agent it already targets, even one missing from this machine's $HOME: unchecked, it
      // would be cleaned.
      const preSelected = firstInstall
        ? detected.filter((a) => previousAgents.has(a))
        : [...new Set([...detected, ...previousAgents])]

      if (detected.length === 0 && previousAgents.size === 0) {
        targetAgents = ALL_AGENTS
        p.log.info('No agents detected, installing to all agents')
      } else if (detected.length === 1 && previousAgents.size === 0) {
        targetAgents = detected
        p.log.info(`Installing to: ${pc.cyan(agents[detected[0]!].displayName)}`)
      } else {
        const agentChoices = ALL_AGENTS.map((a) => ({
          value: a,
          label: agents[a].displayName,
        }))

        const selected = await p.multiselect({
          message: `Select agents ${pc.dim('(space to toggle, uncheck to clean)')}`,
          options: agentChoices as any,
          initialValues: preSelected,
          required: false,
        })

        if (p.isCancel(selected)) {
          p.cancel('Cancelled')
          await cleanup(tempDir)
          process.exit(0)
        }

        targetAgents = selected as AgentType[]
        removedAgents = [...previousAgents].filter((a) => !targetAgents.includes(a))
      }
    }

    // Determine skills to install and uninstall
    const selectedNames = new Set(selectedSkills.map((s) => s.name))
    const toInstall = selectedSkills
    const toUninstall = (skillsUntouched ? [] : allSkills).filter(
      (s) => installedNames.has(s.name) && !selectedNames.has(s.name),
    )

    // Build standalone MCP map (root-level or mcps/ dir, not tied to any skill)
    const standaloneMcps: Record<string, McpServerConfig> = {}
    for (const entry of allMcpEntries) {
      if (
        (entry.source === 'mcp.json' ||
          entry.source.startsWith('mcps/') ||
          entry.source.startsWith('ref:')) &&
        selectedMcpNames.has(entry.serverName)
      ) {
        standaloneMcps[entry.serverName] = entry.config
      }
    }
    const hasStandaloneMcps = Object.keys(standaloneMcps).length > 0

    // Build selected hooks map
    const selectedHookGroups: HookEntry[] = allHookEntries.filter((e) =>
      selectedHookNames.has(e.groupName),
    )
    const hasSelectedHooks = selectedHookGroups.length > 0

    if (
      toInstall.length === 0 &&
      toUninstall.length === 0 &&
      removedAgents.length === 0 &&
      !hasStandaloneMcps &&
      !hasSelectedHooks
    ) {
      p.log.info('Nothing to do.')
      await cleanup(tempDir)
      p.outro('')
      return
    }

    // A same-named skill absent from the lock was written by hand: never replace it silently.
    if (!force) {
      const unmanaged: string[] = []
      for (const skill of selectedSkills) {
        // An entry without `agents` predates the field: the skill is ours, its agents unknown.
        const lockedAgents = Object.hasOwn(startLock.skills, skill.name)
          ? (startLock.skills[skill.name]!.agents ?? [])
          : undefined
        const paths = await findUnmanagedSkillPaths(skill.name, targetAgents, lockedAgents)
        if (paths.length > 0) unmanaged.push(`  ${skill.name}: ${paths.join(', ')}`)
      }
      if (unmanaged.length > 0) {
        const noLock = existsSync('ai-lock.json') ? '' : ' No ai-lock.json found in this directory.'
        throw new Error(
          `Refusing to overwrite skill files that ai-lock.json does not record (written by hand or by another tool):\n${unmanaged.join('\n')}\nRename or move them, or re-run with --force to replace them.${noLock}`,
        )
      }
    }

    // Confirm
    if (!skipPrompts) {
      if (selectedSkills.length > 0) {
        p.log.info(`Install: ${selectedSkills.map((s) => pc.cyan(s.name)).join(', ')}`)
      }
      if (selectedMcpNames.size > 0) {
        p.log.info(`MCP servers: ${[...selectedMcpNames].map((n) => pc.cyan(n)).join(', ')}`)
      }
      if (selectedHookNames.size > 0) {
        p.log.info(`Hooks: ${[...selectedHookNames].map((n) => pc.cyan(n)).join(', ')}`)
      }
      if (toUninstall.length > 0) {
        p.log.info(`Remove skills: ${toUninstall.map((s) => pc.red(s.name)).join(', ')}`)
      }
      if (removedAgents.length > 0) {
        p.log.info(
          `Clean agents: ${removedAgents.map((a) => pc.red(agents[a].displayName)).join(', ')}`,
        )
      }
      p.log.info(`Agents: ${targetAgents.map((a) => pc.cyan(agents[a].displayName)).join(', ')}`)

      // Ask whether to trust these configs (only when something is actually being installed
      // and the user did not already pass --trusted)
      const installingSomething = toInstall.length > 0 || hasStandaloneMcps || hasSelectedHooks
      if (trustChoice === undefined && installingSomething) {
        const trust = await p.confirm({
          message: `Trust these configs? ${pc.dim('(maconfai update will fetch the latest blindly)')}`,
          initialValue: false,
        })
        if (p.isCancel(trust)) {
          p.cancel('Cancelled')
          await cleanup(tempDir)
          process.exit(0)
        }
        trustChoice = trust
      }

      const confirmed = await p.confirm({ message: 'Proceed?' })
      if (p.isCancel(confirmed) || !confirmed) {
        p.cancel('Cancelled')
        await cleanup(tempDir)
        process.exit(0)
      }
    }

    // Uninstall unchecked skills from ALL agents (selected + removed)
    if (toUninstall.length > 0) {
      spinner.start('Removing unchecked skills...')
      for (const skill of toUninstall) {
        for (const agent of ALL_AGENTS) {
          await uninstallSkill(skill.name, agent, { global: false })
        }
        await removeFromLock(skill.name).catch(() => {})
      }
      spinner.stop(`Removed ${toUninstall.length} skill(s)`)
    }

    // Uninstall deselected MCP servers (present in source + lock but not selected)
    const lockForDeselect = await readLock()
    const lockedMcpNames = new Set(Object.keys(lockForDeselect.mcpServers))
    const deselectedMcps = (mcpsUntouched ? [] : allMcpEntries)
      .filter((e) => lockedMcpNames.has(e.serverName) && !selectedMcpNames.has(e.serverName))
      .map((e) => e.serverName)
    if (deselectedMcps.length > 0) {
      spinner.start('Removing deselected MCP servers...')
      for (const agent of ALL_AGENTS) {
        await uninstallMcpServers(deselectedMcps, agent)
      }
      for (const name of deselectedMcps) {
        await removeMcpFromLock(name).catch(() => {})
      }
      spinner.stop(`Removed ${deselectedMcps.length} MCP server(s)`)
    }

    // Uninstall deselected hook groups (present in source + lock but not selected)
    const lockedHookNames = new Set(Object.keys(lockForDeselect.hooks))
    const deselectedHooks = (hooksUntouched ? [] : allHookEntries).filter(
      (e) => lockedHookNames.has(e.groupName) && !selectedHookNames.has(e.groupName),
    )
    if (deselectedHooks.length > 0) {
      spinner.start('Removing deselected hooks...')
      for (const entry of deselectedHooks) {
        const lockEntry = lockForDeselect.hooks[entry.groupName]
        if (lockEntry?.handlers) {
          for (const agent of ALL_AGENTS) {
            const events = lockEntry.handlers[agent] as Record<string, unknown[]> | undefined
            if (events) {
              await uninstallHooks(events, agent)
            }
          }
        }
        await removeHookFromLock(entry.groupName).catch(() => {})
      }
      spinner.stop(`Removed ${deselectedHooks.length} hook(s)`)
    }

    // Clean removed agents: remove ALL discovered skills from their directories
    if (removedAgents.length > 0) {
      spinner.start('Cleaning removed agents...')
      for (const skill of allSkills.filter((s) => Object.hasOwn(startLock.skills, s.name))) {
        for (const agent of removedAgents) {
          await uninstallSkill(skill.name, agent, { global: false })
        }
      }
      spinner.stop(`Cleaned ${removedAgents.map((a) => agents[a].displayName).join(', ')}`)
    }

    const ownerRepo = getOwnerRepo(parsed)

    // Snapshot of trust state before writing — lets the -y default preserve a config's
    // existing trust while defaulting brand-new configs to non-trusted
    const priorLock = await readLock()

    // Install selected skills
    if (selectedSkills.length > 0) {
      spinner.start('Installing skills...')

      // Count skills and agents apart: one skill written for three agents is one skill, not three
      let successCount = 0
      const successAgents = new Set<AgentType>()
      let failCount = 0
      const failedAgents = new Set<AgentType>()

      for (const skill of selectedSkills) {
        let skillSuccess = false
        for (const agent of targetAgents) {
          const result = await installSkill(skill, agent, { global: false })
          if (result.success) {
            successAgents.add(agent)
            skillSuccess = true
          } else {
            failCount++
            failedAgents.add(agent)
            p.log.error(`Failed: ${skill.name} -> ${agents[agent].displayName}: ${result.error}`)
          }
        }

        if (skillSuccess) {
          successCount++
          const ctx = skillCtxMap.get(skill.name)
          const skillRelPath = ctx
            ? ctx.skillRelPath
            : repoRelativePath(parsed.subpath, relative(skillsDir, skill.path))
          let skillFolderHash = ''
          try {
            skillFolderHash = await getTreeHash(ctx ? ctx.repoDir : skillsDir, skillRelPath)
          } catch {}
          await addToLock(skill.name, {
            source: ctx ? ctx.source : ownerRepo || source,
            sourceUrl: ctx
              ? ctx.sourceUrl
              : parsed.type === 'local'
                ? parsed.localPath!
                : parsed.url,
            skillPath: skillRelPath,
            ref: ctx ? ctx.ref : parsed.ref,
            skillFolderHash,
            agents: targetAgents,
            trusted: resolveTrust(trustChoice, priorLock.skills[skill.name]),
          })
        }
      }

      spinner.stop('Done')

      if (successCount > 0) {
        p.log.success(
          pc.green(`Installed ${successCount} skill(s) for ${successAgents.size} agent(s)`),
        )
      }
      if (failCount > 0) {
        // Failures are per skill × agent copy, so say so: they are not a number of skills
        p.log.error(
          pc.red(`Failed: ${failCount} skill copy(ies) for ${failedAgents.size} agent(s)`),
        )
      }
    }

    // Install standalone MCP servers (from root mcp.json)
    if (hasStandaloneMcps) {
      spinner.start('Installing MCP servers...')
      const existingLock = await readLock()
      const ownedMcpNames = new Set(Object.keys(existingLock.mcpServers))

      const installedMcpNames = new Set<string>()
      const mcpAgents = new Set<AgentType>()
      for (const agent of targetAgents) {
        const result = await installMcpServers(standaloneMcps, agent, { ownedNames: ownedMcpNames })
        for (const name of result.installed) installedMcpNames.add(name)
        if (result.installed.length > 0) mcpAgents.add(agent)
      }

      for (const serverName of installedMcpNames) {
        const mcpEntry = allMcpEntries.find((e) => e.serverName === serverName)!
        const folderPath = mcpEntry.source
        let folderHash = ''
        if (parsed.type !== 'local') {
          try {
            folderHash = await getTreeHash(skillsDir, folderPath)
          } catch {}
        }
        await addMcpToLock(serverName, {
          source: ownerRepo || source,
          sourceUrl: parsed.type === 'local' ? parsed.localPath! : parsed.url,
          ref: parsed.ref,
          folderPath,
          folderHash,
          agents: targetAgents,
          trusted: resolveTrust(trustChoice, priorLock.mcpServers[serverName]),
        })
      }
      // Never a "Installed 0": say what was written, and name what was written nowhere
      spinner.stop(
        installedMcpNames.size > 0
          ? `Installed ${installedMcpNames.size} MCP server(s) for ${mcpAgents.size} agent(s)`
          : 'No MCP server installed',
      )
      const unwrittenMcps = Object.keys(standaloneMcps).filter((n) => !installedMcpNames.has(n))
      if (unwrittenMcps.length > 0) {
        p.log.warn(`No MCP server written for these agents: ${unwrittenMcps.join(', ')}`)
      }
    }

    // Install hooks
    if (hasSelectedHooks) {
      spinner.start('Installing hooks...')
      let installedHookCount = 0
      const hookWrittenAgents = new Set<AgentType>()
      // Groups no selected agent has on disk after this run: nothing written, nothing already there
      const unwrittenHooks: string[] = []
      for (const entry of selectedHookGroups) {
        // Copy companion files (scripts, etc.) from hook directory
        if (entry.dirPath) {
          await installHookFiles(entry.dirPath, entry.groupName)
        }

        // Agents where this run wrote a handler, and agents that already had them all
        const writtenAgents: AgentType[] = []
        let alreadyInstalled = false
        for (const agent of targetAgents) {
          const agentKey = agent as keyof HookGroup
          const hookEvents = entry.group[agentKey]
          if (hookEvents && typeof hookEvents === 'object' && !Array.isArray(hookEvents)) {
            const result = await installHooks(hookEvents as Record<string, unknown[]>, agent)
            if (result.installed.length > 0) writtenAgents.push(agent)
            else if (agents[agent].hooksConfigPath && result.skipped.length > 0) {
              alreadyInstalled = true
            }
          }
        }
        // A group counts as installed only where a handler was actually written
        if (writtenAgents.length > 0) installedHookCount++
        else if (!alreadyInstalled) unwrittenHooks.push(entry.groupName)
        for (const agent of writtenAgents) hookWrittenAgents.add(agent)
        const folderPath = entry.source
        let folderHash = ''
        if (parsed.type !== 'local') {
          try {
            folderHash = await getTreeHash(skillsDir, folderPath)
          } catch {}
        }
        const installedHandlers: Record<string, unknown> = {}
        for (const agent of targetAgents) {
          const agentKey = agent as keyof HookGroup
          const events = entry.group[agentKey]
          // An agent without a hooks config gets nothing written, so nothing may be recorded
          // for it either: a lock claiming a handler that is not on disk is never repaired.
          if (
            agents[agent].hooksConfigPath &&
            events &&
            typeof events === 'object' &&
            !Array.isArray(events)
          ) {
            installedHandlers[agent] = events
          }
        }
        await addHookToLock(entry.groupName, {
          source: ownerRepo || source,
          sourceUrl: parsed.type === 'local' ? parsed.localPath! : parsed.url,
          ref: parsed.ref,
          folderPath,
          folderHash,
          agents: targetAgents,
          trusted: resolveTrust(trustChoice, priorLock.hooks[entry.groupName]),
          handlers: installedHandlers,
        })
      }
      spinner.stop(
        installedHookCount > 0
          ? `Installed ${installedHookCount} hook(s) for ${hookWrittenAgents.size} agent(s)`
          : unwrittenHooks.length < selectedHookGroups.length
            ? 'Hooks already installed'
            : 'No hook installed',
      )
      if (unwrittenHooks.length > 0) {
        p.log.warn(`No hook written for these agents: ${unwrittenHooks.join(', ')}`)
      }
    }
  } catch (error) {
    spinner.stop(pc.red('Error'))
    p.log.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  } finally {
    await cleanup(tempDir)
    for (const d of refTempDirs) {
      await cleanupTempDir(d).catch(() => {})
    }
  }

  console.log()
  p.outro(pc.green('Done!'))
}

async function runUninstall(): Promise<void> {
  console.log()
  p.intro(pc.bgCyan(pc.black(' maconfai uninstall ')))

  const spinner = p.spinner()

  // Only the current directory's project: user-scope skills (~/.claude/skills,
  // ~/.agents/skills…) are never listed nor removed. To uninstall from another
  // project, cd into it first.
  spinner.start('Scanning installed configs...')
  const allSkills = await listInstalledSkills({ global: false })
  const lock = await readLock()
  const installedMcps = Object.keys(lock.mcpServers)
  const installedHooks = Object.keys(lock.hooks)
  spinner.stop(
    `Found ${allSkills.length} skill(s), ${installedMcps.length} MCP server(s), ${installedHooks.length} hook(s)`,
  )

  if (allSkills.length === 0 && installedMcps.length === 0 && installedHooks.length === 0) {
    p.log.info('Nothing installed.')
    p.outro('')
    return
  }

  // Select skills to remove
  let skillsToRemove: typeof allSkills = []
  if (allSkills.length > 0) {
    const skillChoices = allSkills.map((s) => ({
      value: s,
      label: `${s.name} ${pc.dim(`(${s.agents.map((a) => agents[a].displayName).join(', ')})`)}`,
    }))

    const selectedSkills = await p.multiselect({
      message: `Select skills to uninstall ${pc.dim('(space to toggle)')}`,
      options: skillChoices as any,
      required: false,
    })

    if (p.isCancel(selectedSkills)) {
      p.cancel('Cancelled')
      process.exit(0)
    }

    skillsToRemove = selectedSkills as typeof allSkills
  }

  // Select MCP servers to remove
  let mcpsToRemove: string[] = []
  if (installedMcps.length > 0) {
    const mcpChoices = installedMcps.map((n) => ({ value: n, label: n }))

    const selectedMcps = await p.multiselect({
      message: `Select MCP servers to uninstall ${pc.dim('(space to toggle)')}`,
      options: mcpChoices as any,
      required: false,
    })

    if (p.isCancel(selectedMcps)) {
      p.cancel('Cancelled')
      process.exit(0)
    }

    mcpsToRemove = selectedMcps as string[]
  }

  // Select hook groups to remove
  let hooksToRemove: string[] = []
  if (installedHooks.length > 0) {
    const hookChoices = installedHooks.map((n) => ({ value: n, label: n }))

    const selectedHooks = await p.multiselect({
      message: `Select hooks to uninstall ${pc.dim('(space to toggle)')}`,
      options: hookChoices as any,
      required: false,
    })

    if (p.isCancel(selectedHooks)) {
      p.cancel('Cancelled')
      process.exit(0)
    }

    hooksToRemove = selectedHooks as string[]
  }

  const totalToRemove = skillsToRemove.length + mcpsToRemove.length + hooksToRemove.length
  if (totalToRemove === 0) {
    p.log.info('Nothing selected.')
    p.outro('')
    return
  }

  const confirmed = await p.confirm({
    message: `Remove ${totalToRemove} item(s)?`,
  })

  if (p.isCancel(confirmed) || !confirmed) {
    p.cancel('Cancelled')
    process.exit(0)
  }

  if (skillsToRemove.length > 0) {
    spinner.start('Removing skills...')
    for (const skill of skillsToRemove) {
      for (const agent of skill.agents) {
        await uninstallSkill(skill.dirName, agent)
      }
      await removeFromLock(skill.name).catch(() => {})
    }
    spinner.stop(`Removed ${skillsToRemove.length} skill(s)`)
  }

  if (mcpsToRemove.length > 0) {
    spinner.start('Removing MCP servers...')
    for (const agent of ALL_AGENTS) {
      await uninstallMcpServers(mcpsToRemove, agent)
    }
    for (const name of mcpsToRemove) {
      await removeMcpFromLock(name).catch(() => {})
    }
    spinner.stop(`Removed ${mcpsToRemove.length} MCP server(s)`)
  }

  if (hooksToRemove.length > 0) {
    spinner.start('Removing hooks...')
    for (const groupName of hooksToRemove) {
      const lockEntry = lock.hooks[groupName]
      if (lockEntry?.handlers) {
        for (const agent of ALL_AGENTS) {
          const events = lockEntry.handlers[agent] as Record<string, unknown[]> | undefined
          if (events) {
            await uninstallHooks(events, agent)
          }
        }
      }
      await removeHookFromLock(groupName).catch(() => {})
    }
    spinner.stop(`Removed ${hooksToRemove.length} hook(s)`)
  }

  console.log()
  p.outro(pc.green('Done!'))
}

async function cleanup(tempDir: string | null): Promise<void> {
  if (tempDir) {
    await cleanupTempDir(tempDir).catch(() => {})
  }
}
