import { it, expect } from 'vitest'
import { rm } from 'fs/promises'
import { join } from 'path'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'update / an agent dir absent from the checkout is not recreated',
  ({ givenSkill, whenInstall, whenUpdate, targetFiles, getTargetDir }) => {
    it('should leave a gitignored .cursor/ alone, as in a fresh clone', async () => {
      await givenSkill('alpha')
      await whenInstall({ agents: ['claude-code', 'cursor'], extraArgs: ['--trusted'] })

      // A fresh clone of a repo that gitignores .cursor/: the lock still lists cursor
      await rm(join(getTargetDir(), '.cursor'), { recursive: true })
      await whenUpdate()

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
