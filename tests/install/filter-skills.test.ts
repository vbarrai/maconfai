import { it } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'install / --skills filter',
  ({ givenSkill, whenInstall, targetHasFiles, targetHasNoFiles }) => {
    it('should only install the selected skill', async () => {
      await givenSkill('wanted', 'unwanted')

      await whenInstall({ skills: ['wanted'], agents: ['claude-code'] })

      await targetHasFiles('.agents/skills/wanted/SKILL.md', '.claude/skills/wanted')
      await targetHasNoFiles('.agents/skills/unwanted/SKILL.md', '.claude/skills/unwanted')
    })
  },
)
