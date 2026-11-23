import { mkdtemp, mkdir, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { vi } from 'vitest'
import { sanitizeName } from '../../src/installer.ts'
import { getLogs, mocks } from '../check/check-test-utils.ts'

vi.mock('picocolors')
vi.mock('@clack/prompts', () => mocks)
vi.mock('../../src/lock.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lock.ts')>()
  return {
    ...actual,
    fetchSkillFolderHash: async () => 'new-folder-hash',
    getGitHubToken: () => null,
  }
})

export function updatedSkillNamed(name: string): string {
  return `---
name: ${name}
description: Updated skill
---
Updated instructions`
}

type LegacyAgent = 'claude-code' | 'cursor' | 'codex' | 'open-code'

const skillsDirs: Record<LegacyAgent, string> = {
  'claude-code': '.claude/skills',
  cursor: '.cursor/skills',
  codex: '.codex/skills',
  'open-code': '.opencode/skills',
}

// Runs `update` on a lock entry written before `agents` was recorded. `skillName` is the lock
// key and SKILL.md name; installed dirs use the names given per agent.
export async function updateLegacySkill(
  installedSkills: Partial<Record<LegacyAgent, string[]>>,
  skillName = 'my-skill',
): Promise<{
  agents: string[] | undefined
  files: Record<LegacyAgent, string | null>
  logs: string
}> {
  const tempDir = await mkdtemp(join(tmpdir(), 'maconfai-legacy-update-'))
  const sourceDir = join(tempDir, 'source')
  const targetDir = join(tempDir, 'target')
  const originalCwd = process.cwd()

  try {
    const sourceSkillDir = join(sourceDir, 'skills', sanitizeName(skillName))
    await mkdir(sourceSkillDir, { recursive: true })
    await mkdir(targetDir, { recursive: true })
    await writeFile(join(sourceSkillDir, 'SKILL.md'), updatedSkillNamed(skillName))

    for (const [agent, names] of Object.entries(installedSkills) as [LegacyAgent, string[]][]) {
      for (const name of names) {
        const skillDir = join(targetDir, skillsDirs[agent], name)
        await mkdir(skillDir, { recursive: true })
        await writeFile(join(skillDir, 'SKILL.md'), 'outdated instructions')
      }
    }

    await writeFile(
      join(targetDir, 'ai-lock.json'),
      JSON.stringify({
        version: 1,
        skills: {
          [skillName]: {
            source: sourceDir,
            sourceUrl: sourceDir,
            skillPath: `skills/${sanitizeName(skillName)}/SKILL.md`,
            skillFolderHash: 'old-folder-hash',
            trusted: true,
            installedAt: '2025-01-01T00:00:00.000Z',
            updatedAt: '2025-01-01T00:00:00.000Z',
          },
        },
        mcpServers: {},
        hooks: {},
      }),
    )

    process.chdir(targetDir)
    const { runCheck } = await import('../../src/check.ts')
    await runCheck([], { autoUpdate: true })

    const lock = JSON.parse(await readFile(join(targetDir, 'ai-lock.json'), 'utf-8'))
    const files = Object.fromEntries(
      await Promise.all(
        (Object.entries(skillsDirs) as [LegacyAgent, string][]).map(async ([agent, dir]) => [
          agent,
          await readFile(join(targetDir, dir, sanitizeName(skillName), 'SKILL.md'), 'utf-8').catch(
            () => null,
          ),
        ]),
      ),
    ) as Record<LegacyAgent, string | null>

    return {
      agents: lock.skills[skillName].agents,
      files,
      logs: getLogs().replaceAll(sourceDir, '<source>'),
    }
  } finally {
    process.chdir(originalCwd)
    await rm(tempDir, { recursive: true, force: true })
  }
}
