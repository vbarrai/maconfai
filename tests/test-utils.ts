import { expect, describe, beforeEach, afterEach, vi } from 'vitest'
import { mkdtemp, rm, writeFile, mkdir, readFile, readdir, access } from 'fs/promises'
import { join, relative } from 'path'
import { tmpdir } from 'os'
import type { AgentType, McpServerConfig, HookGroup } from '../src/types.ts'
import { runInstall } from '../src/install.ts'

type FileTree = Record<string, string>

export function skillFile(name: string): string {
  const description = name.replace(/-/g, ' ')
  return `---\nname: ${name}\ndescription: ${description}\n---\n${description}`
}

// ── MCP fixtures ────────────────────────────────────────────

export const mcpGithub: McpServerConfig = {
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-github'],
}

export const mcpGithubWithEnv: McpServerConfig = {
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-github'],
  env: { GITHUB_TOKEN: '${GITHUB_TOKEN}', GITHUB_ORG: '${GITHUB_ORG}' },
}

export const mcpLinear: McpServerConfig = {
  command: 'npx',
  args: ['-y', 'mcp-remote', 'https://mcp.linear.app/mcp'],
}

export const mcpLinearUrl: McpServerConfig = {
  url: 'https://mcp.linear.app/sse',
}

export const mcpCustomApi: McpServerConfig = {
  url: 'https://api.example.com/mcp',
  headers: { Authorization: 'Bearer ${API_TOKEN}', 'X-Team-Id': '${TEAM_ID}' },
}

// ── Hook fixtures ───────────────────────────────────────────

export const hookBlockRm: Record<string, HookGroup> = {
  'block-rm': {
    'claude-code': {
      PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'block-rm.sh' }] }],
    },
  },
}

export const hookBlockRmClaudeCode: Record<string, HookGroup> = {
  'block-rm': {
    'claude-code': {
      PreToolUse: [
        { matcher: 'Bash', hooks: [{ type: 'command', command: '.claude/hooks/block-rm.sh' }] },
      ],
    },
  },
}

export const hookBlockRmCursor: Record<string, HookGroup> = {
  'block-rm': {
    cursor: {
      beforeShellExecution: [{ command: '.cursor/hooks/block-rm.sh', matcher: '^rm ' }],
    },
  },
}

export const hookLintOnEdit: Record<string, HookGroup> = {
  'lint-on-edit': {
    'claude-code': {
      PostToolUse: [{ matcher: 'Edit', hooks: [{ type: 'command', command: 'lint.sh' }] }],
    },
  },
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

export function remoteRefYaml(opts: {
  source: string
  include?: Array<'skills' | 'mcps' | 'hooks'>
  prefix?: string
}): string {
  const lines = [`source: ${opts.source}`]
  if (opts.include?.length) lines.push(`include: [${opts.include.join(', ')}]`)
  if (opts.prefix) lines.push(`prefix: ${opts.prefix}`)
  return lines.join('\n')
}

export type SkillLayout = 'skills-dir' | 'root-dirs' | 'root-single'

export interface SkillFixture {
  name: string
}

export function setupScenario() {
  let tempDir: string
  let sourceDir: string
  let targetDir: string
  const extraDirs: string[] = []

  async function init() {
    tempDir = await mkdtemp(join(tmpdir(), 'maconfai-e2e-'))
    sourceDir = join(tempDir, 'source')
    targetDir = join(tempDir, 'target')
    await mkdir(sourceDir, { recursive: true })
    await mkdir(targetDir, { recursive: true })
  }

  async function cleanup() {
    await rm(tempDir, { recursive: true, force: true })
    for (const d of extraDirs) {
      await rm(d, { recursive: true, force: true }).catch(() => {})
    }
  }

  async function givenRemoteSkill(name: string): Promise<string> {
    const remoteDir = await mkdtemp(join(tmpdir(), 'maconfai-remote-'))
    extraDirs.push(remoteDir)
    const skillDir = join(remoteDir, 'skills', name)
    await mkdir(skillDir, { recursive: true })
    await writeFile(join(skillDir, 'SKILL.md'), skillFile(name))
    return remoteDir
  }

  async function givenRemoteRef(name: string, refContent: string): Promise<string> {
    const remoteDir = await mkdtemp(join(tmpdir(), 'maconfai-remote-'))
    extraDirs.push(remoteDir)
    const skillsDir = join(remoteDir, 'skills')
    await mkdir(skillsDir, { recursive: true })
    await writeFile(join(skillsDir, `${name}.yml`), refContent)
    return remoteDir
  }

  async function given(files: FileTree) {
    for (const [path, content] of Object.entries(files)) {
      const fullPath = join(sourceDir, path)
      await mkdir(join(fullPath, '..'), { recursive: true })
      await writeFile(fullPath, content)
    }
  }

  async function givenSource(opts: {
    skills?: SkillFixture[]
    skillLayout?: SkillLayout
    remoteRefs?: Record<string, string>
    mcps?: Record<string, McpServerConfig>
    mcpDirs?: Record<string, McpServerConfig>
    hooks?: Record<string, HookGroup>
    hookDirs?: Record<string, HookGroup>
    hookDirFiles?: Record<string, Record<string, string>>
  }) {
    const files: FileTree = {}
    const layout = opts.skillLayout ?? 'skills-dir'

    for (const skill of opts.skills ?? []) {
      const path =
        layout === 'skills-dir'
          ? `./skills/${skill.name}/SKILL.md`
          : layout === 'root-dirs'
            ? `./${skill.name}/SKILL.md`
            : `./SKILL.md`
      files[path] = skillFile(skill.name)
    }

    for (const [name, refTarget] of Object.entries(opts.remoteRefs ?? {})) {
      files[`./skills/${name}.yml`] = refTarget
    }

    if (opts.mcps) {
      files['./mcp.json'] = JSON.stringify({ mcpServers: opts.mcps }, null, 2)
    }

    if (opts.mcpDirs) {
      for (const [name, config] of Object.entries(opts.mcpDirs)) {
        files[`./mcps/${name}/mcp.json`] = JSON.stringify(
          { mcpServers: { [name]: config } },
          null,
          2,
        )
      }
    }

    if (opts.hooks) {
      files['./hooks.json'] = JSON.stringify({ hooks: opts.hooks }, null, 2)
    }

    if (opts.hookDirs) {
      for (const [name, group] of Object.entries(opts.hookDirs)) {
        files[`./hooks/${name}/hooks.json`] = JSON.stringify({ hooks: { [name]: group } }, null, 2)
      }
    }

    if (opts.hookDirFiles) {
      for (const [hookName, hookFiles] of Object.entries(opts.hookDirFiles)) {
        for (const [fileName, content] of Object.entries(hookFiles)) {
          files[`./hooks/${hookName}/${fileName}`] = content
        }
      }
    }

    await given(files)
  }

  async function sourceFiles(): Promise<string[]> {
    const files: string[] = []
    async function walk(dir: string) {
      const entries = await readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = join(dir, entry.name)
        if (entry.isDirectory()) {
          await walk(fullPath)
        } else if (entry.isFile()) {
          files.push(relative(sourceDir, fullPath))
        }
      }
    }
    await walk(sourceDir)
    return files.sort()
  }

  async function givenSkill(...names: string[]) {
    await givenSource({ skills: names.map((name) => ({ name })) })
  }

  async function givenSkillWithMcp(name: string, mcpServers: Record<string, McpServerConfig>) {
    await givenSource({ skills: [{ name }], mcpDirs: mcpServers })
  }

  async function whenInstall(opts: {
    skills?: string[]
    agents?: AgentType[]
    mcps?: string[]
    hooks?: string[]
    extraArgs?: string[]
  }) {
    const args = [sourceDir, '-y']

    if (opts.skills?.length) {
      args.push(`--skills=${opts.skills.join(',')}`)
    }
    if (opts.agents?.length) {
      args.push(`--agents=${opts.agents.join(',')}`)
    }
    if (opts.mcps !== undefined) {
      args.push(`--mcps=${opts.mcps.join(',')}`)
    }
    if (opts.hooks !== undefined) {
      args.push(`--hooks=${opts.hooks.join(',')}`)
    }
    if (opts.extraArgs?.length) {
      args.push(...opts.extraArgs)
    }

    const originalCwd = process.cwd()
    try {
      process.chdir(targetDir)
      await runInstall(args)
    } finally {
      process.chdir(originalCwd)
    }
  }

  function getSourceDir() {
    return sourceDir
  }

  function getTargetDir() {
    return targetDir
  }

  async function then(expected: FileTree) {
    for (const [path, expectedContent] of Object.entries(expected)) {
      const fullPath = join(targetDir, path)
      const content = await readFile(fullPath, 'utf-8')
      expect(content).toBe(expectedContent)
    }
  }

  async function thenExists(path: string): Promise<boolean> {
    return exists(join(targetDir, path))
  }

  async function targetFiles(): Promise<string[]> {
    const files: string[] = []
    async function walk(dir: string) {
      const entries = await readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = join(dir, entry.name)
        if (entry.isDirectory()) {
          await walk(fullPath)
        } else if (entry.isFile() || entry.isSymbolicLink()) {
          files.push(relative(targetDir, fullPath))
        }
      }
    }
    await walk(targetDir)
    return files.sort()
  }

  async function targetFile(path: string): Promise<string> {
    return readFile(join(targetDir, path), 'utf-8')
  }

  async function thenMcpConfig(path: string): Promise<Record<string, any>> {
    const fullPath = join(targetDir, path)
    const content = await readFile(fullPath, 'utf-8')
    return JSON.parse(content)
  }

  async function targetHasFiles(...expected: string[]) {
    const files = await targetFiles()
    for (const f of expected) {
      expect(files).toContain(f)
    }
  }

  async function targetHasNoFiles(...excluded: string[]) {
    const files = await targetFiles()
    for (const f of excluded) {
      expect(files).not.toContain(f)
    }
  }

  return {
    init,
    cleanup,
    given,
    givenSource,
    givenSkill,
    givenSkillWithMcp,
    givenRemoteSkill,
    givenRemoteRef,
    sourceFiles,
    whenInstall,
    then,
    thenExists,
    targetFile,
    targetFiles,
    targetHasFiles,
    targetHasNoFiles,
    thenMcpConfig,
    getSourceDir,
    getTargetDir,
  }
}

type Scenario = ReturnType<typeof setupScenario>

export function describeConfai(name: string, fn: (scenario: Scenario) => void) {
  describe(name, () => {
    const scenario = setupScenario()
    beforeEach(() => scenario.init())
    afterEach(() => scenario.cleanup())
    fn(scenario)
  })
}
