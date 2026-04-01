import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'install / deselecting a skill removes it',
  ({ givenSkill, whenInstall, targetHasFiles, targetHasNoFiles }) => {
    it('should remove the deselected skill on re-install', async () => {
      await givenSkill('keep', 'drop')

      await whenInstall({ agents: ['claude-code'] })

      await targetHasFiles(
        '.agents/skills/drop/SKILL.md',
        '.agents/skills/keep/SKILL.md',
        '.claude/skills/drop',
        '.claude/skills/keep',
        'ai-lock.json',
      )

      await whenInstall({ skills: ['keep'], agents: ['claude-code'] })

      await targetHasFiles('.agents/skills/keep/SKILL.md', '.claude/skills/keep')
      await targetHasNoFiles('.agents/skills/drop/SKILL.md', '.claude/skills/drop')
    })
  },
)
