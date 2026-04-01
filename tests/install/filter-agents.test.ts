import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'install / --agents filter',
  ({ givenSkill, whenInstall, targetHasFiles, targetHasNoFiles }) => {
    it('should only install to the specified agent', async () => {
      await givenSkill('my-skill')

      await whenInstall({ skills: ['my-skill'], agents: ['cursor'] })

      await targetHasFiles('.agents/skills/my-skill/SKILL.md', '.cursor/skills/my-skill')
      await targetHasNoFiles('.claude/skills/my-skill')
    })
  },
)
