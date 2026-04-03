import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'install / --skills adds without removing existing',
  ({ givenSkill, whenInstall, targetHasFiles }) => {
    it('should keep previously installed skills when adding new ones', async () => {
      await givenSkill('old-a', 'old-b', 'new-c')

      await whenInstall({ skills: ['old-a', 'old-b'], agents: ['claude-code'] })

      await targetHasFiles('.agents/skills/old-a/SKILL.md', '.agents/skills/old-b/SKILL.md')

      await whenInstall({ skills: ['new-c'], agents: ['claude-code'] })

      await targetHasFiles(
        '.agents/skills/new-c/SKILL.md',
        '.agents/skills/old-a/SKILL.md',
        '.agents/skills/old-b/SKILL.md',
      )
    })
  },
)
