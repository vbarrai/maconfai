import { it, expect, vi } from 'vitest'
import { describeConfai } from '../test-utils.ts'
import { runInstall } from '../../src/install.ts'

// Interactive run: the skill list comes back with `drop` unchecked, every confirm says yes
vi.mock('@clack/prompts', async (importOriginal) => ({
  ...((await importOriginal()) as Record<string, unknown>),
  multiselect: async (opts: any) =>
    opts.options.map((o: any) => o.value).filter((v: any) => v.name !== 'drop'),
  confirm: async () => true,
}))

describeConfai(
  'install / lock removes unchecked skills',
  ({ givenSkill, whenInstall, getSourceDir, getTargetDir, targetFile }) => {
    it('should remove skill from lock when unchecked', async () => {
      await givenSkill('keep', 'drop')

      await whenInstall({ agents: ['claude-code'] })

      const lockBefore = JSON.parse(await targetFile('ai-lock.json'))
      expect(Object.keys(lockBefore.skills).sort()).toMatchInlineSnapshot(`
        [
          "drop",
          "keep",
        ]
      `)

      const originalCwd = process.cwd()
      try {
        process.chdir(getTargetDir())
        await runInstall([getSourceDir(), '--agents=claude-code'])
      } finally {
        process.chdir(originalCwd)
      }

      const lockAfter = JSON.parse(await targetFile('ai-lock.json'))
      expect(Object.keys(lockAfter.skills)).toMatchInlineSnapshot(`
        [
          "keep",
        ]
      `)
    })
  },
)
