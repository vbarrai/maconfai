import { it, expect, vi } from 'vitest'
import { describeConfai } from '../test-utils.ts'
import { runInstall } from '../../src/install.ts'

describeConfai(
  'uninstall / -y without a source is refused',
  ({ givenSkill, whenInstall, getTargetDir, targetFiles }) => {
    it('should exit with an error and remove nothing', async () => {
      await givenSkill('alpha')
      await whenInstall({ agents: ['claude-code'] })

      const exit = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
        throw new Error(`process.exit(${code})`)
      }) as never)
      const originalCwd = process.cwd()
      try {
        process.chdir(getTargetDir())
        await expect(runInstall(['-y'])).rejects.toThrow('process.exit(1)')
      } finally {
        process.chdir(originalCwd)
        exit.mockRestore()
      }

      expect(await targetFiles()).toMatchInlineSnapshot(`
        [
          ".agents/skills/alpha/SKILL.md",
          ".claude/skills/alpha",
          "ai-lock.json",
        ]
      `)
    })
  },
)
