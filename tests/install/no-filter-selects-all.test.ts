import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'install / no filter selects all skills',
  ({ givenSkill, whenInstall, targetHasFiles }) => {
    it('should install all skills when no --skills filter is given', async () => {
      await givenSkill('alpha', 'beta')

      await whenInstall({ agents: ['claude-code'] })

      await targetHasFiles(
        '.agents/skills/alpha/SKILL.md',
        '.agents/skills/beta/SKILL.md',
        '.claude/skills/alpha',
        '.claude/skills/beta',
        'ai-lock.json',
      )
    })
  },
)
