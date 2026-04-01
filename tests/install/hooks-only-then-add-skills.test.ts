import { it, expect } from 'vitest'
import { describeConfai, hookBlockRm } from '../test-utils.ts'

describeConfai(
  'install / hooks first, then add skills on second install',
  ({ givenSource, whenInstall, targetHasFiles }) => {
    it('should keep hooks when adding skills', async () => {
      await givenSource({
        skills: [{ name: 'lint' }],
        hooks: hookBlockRm,
      })

      // First install — hooks only, no skills
      await whenInstall({ skills: [], hooks: ['block-rm'], agents: ['claude-code'] })

      await targetHasFiles(
        '.agents/skills/lint/SKILL.md',
        '.claude/settings.json',
        '.claude/skills/lint',
        'ai-lock.json',
      )

      // Second install — add skills + keep hooks
      await whenInstall({ skills: ['lint'], hooks: ['block-rm'], agents: ['claude-code'] })

      await targetHasFiles(
        '.agents/skills/lint/SKILL.md',
        '.claude/settings.json',
        '.claude/skills/lint',
        'ai-lock.json',
      )
    })
  },
)
