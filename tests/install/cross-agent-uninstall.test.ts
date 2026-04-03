import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'install / --skills preserves other skills across agents',
  ({ givenSkill, whenInstall, targetHasFiles }) => {
    it('should keep all skills when --skills filters a subset', async () => {
      await givenSkill('keep', 'other')

      await whenInstall({ agents: ['claude-code', 'cursor'] })

      await targetHasFiles(
        '.agents/skills/other/SKILL.md',
        '.agents/skills/keep/SKILL.md',
        '.claude/skills/other',
        '.claude/skills/keep',
        '.cursor/skills/other',
        '.cursor/skills/keep',
      )

      await whenInstall({ skills: ['keep'], agents: ['claude-code'] })

      await targetHasFiles(
        '.agents/skills/keep/SKILL.md',
        '.agents/skills/other/SKILL.md',
        '.claude/skills/other',
        '.cursor/skills/other',
      )
    })
  },
)
