import { it, expect } from 'vitest'
import { rm } from 'fs/promises'
import { join } from 'path'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'update / a tracked skill removed from disk is restored',
  ({ givenSkill, whenInstall, whenUpdate, targetFiles, getTargetDir }) => {
    it('should recreate the deleted .claude/skills symlink at an unchanged hash', async () => {
      await givenSkill('alpha', 'beta')
      await whenInstall({ agents: ['claude-code'], extraArgs: ['--trusted'] })

      await rm(join(getTargetDir(), '.claude/skills/alpha'))
      await whenUpdate()

      expect(await targetFiles()).toMatchInlineSnapshot(`
        [
          ".agents/skills/alpha/SKILL.md",
          ".agents/skills/beta/SKILL.md",
          ".claude/skills/alpha",
          ".claude/skills/beta",
          "ai-lock.json",
        ]
      `)
    })
  },
)
