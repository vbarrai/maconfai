import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'install / multiple skills to multiple agents',
  ({ givenSkill, whenInstall, targetHasFiles }) => {
    it('should install two skills to claude-code and cursor', async () => {
      await givenSkill('lint', 'format')

      await whenInstall({ skills: ['lint', 'format'], agents: ['claude-code', 'cursor'] })

      await targetHasFiles(
        '.agents/skills/format/SKILL.md',
        '.agents/skills/lint/SKILL.md',
        '.claude/skills/format',
        '.claude/skills/lint',
        '.cursor/skills/format',
        '.cursor/skills/lint',
        'ai-lock.json',
      )
    })
  },
)
