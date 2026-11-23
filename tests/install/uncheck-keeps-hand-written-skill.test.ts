import { it, expect, vi } from 'vitest'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { describeConfai } from '../test-utils.ts'
import { runInstall } from '../../src/install.ts'

// Interactive run: the skill list comes back with `beta` unchecked, every confirm says yes
vi.mock('@clack/prompts', async (importOriginal) => ({
  ...((await importOriginal()) as Record<string, unknown>),
  multiselect: async (opts: any) =>
    opts.options.map((o: any) => o.value).filter((v: any) => v.name !== 'beta'),
  confirm: async () => true,
}))

describeConfai(
  'install / unchecking a hand-written skill of the same name',
  ({ givenSkill, getSourceDir, getTargetDir, targetFile, targetFiles }) => {
    it('should keep it: only a skill in ai-lock.json is removed on uncheck', async () => {
      await givenSkill('alpha', 'beta')
      // Written by hand, never installed by maconfai: shows up pre-checked
      await mkdir(join(getTargetDir(), '.claude/skills/beta'), { recursive: true })
      await writeFile(join(getTargetDir(), '.claude/skills/beta/SKILL.md'), 'mine')

      const originalCwd = process.cwd()
      try {
        process.chdir(getTargetDir())
        await runInstall([getSourceDir(), '--agents=claude-code'])
      } finally {
        process.chdir(originalCwd)
      }

      expect(await targetFiles()).toMatchInlineSnapshot(`
        [
          ".agents/skills/alpha/SKILL.md",
          ".claude/skills/alpha",
          ".claude/skills/beta/SKILL.md",
          "ai-lock.json",
        ]
      `)
      expect(await targetFile('.claude/skills/beta/SKILL.md')).toBe('mine')
    })
  },
)
