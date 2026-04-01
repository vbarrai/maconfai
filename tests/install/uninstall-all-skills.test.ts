import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'install / deselecting all skills removes everything',
  ({ givenSkill, whenInstall, targetHasFiles, targetHasNoFiles }) => {
    it('should remove all skills when none are selected', async () => {
      await givenSkill('old-a', 'old-b', 'new-c')

      await whenInstall({ skills: ['old-a', 'old-b'], agents: ['claude-code'] })

      await targetHasFiles(
        '.agents/skills/old-a/SKILL.md',
        '.agents/skills/old-b/SKILL.md',
        '.claude/skills/old-a',
        '.claude/skills/old-b',
        'ai-lock.json',
      )

      await whenInstall({ skills: ['new-c'], agents: ['claude-code'] })

      await targetHasFiles('.agents/skills/new-c/SKILL.md', '.claude/skills/new-c')
      await targetHasNoFiles('.agents/skills/old-a/SKILL.md', '.agents/skills/old-b/SKILL.md')
    })
  },
)
