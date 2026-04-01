import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'install / multiple skills to single agent',
  ({ givenSkill, whenInstall, targetHasFiles }) => {
    it('should install two skills to cursor', async () => {
      await givenSkill('lint', 'format')

      await whenInstall({ skills: ['lint', 'format'], agents: ['cursor'] })

      await targetHasFiles(
        '.agents/skills/format/SKILL.md',
        '.agents/skills/lint/SKILL.md',
        '.cursor/skills/format',
        '.cursor/skills/lint',
        'ai-lock.json',
      )
    })
  },
)
