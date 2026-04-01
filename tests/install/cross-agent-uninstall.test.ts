import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'install / deselected skill removed from all agents',
  ({ givenSkill, whenInstall, targetHasFiles, targetHasNoFiles }) => {
    it('should remove skill from both agents even when --agents is narrowed', async () => {
      await givenSkill('keep', 'drop')

      await whenInstall({ agents: ['claude-code', 'cursor'] })

      await targetHasFiles(
        '.agents/skills/drop/SKILL.md',
        '.agents/skills/keep/SKILL.md',
        '.claude/skills/drop',
        '.claude/skills/keep',
        '.cursor/skills/drop',
        '.cursor/skills/keep',
        'ai-lock.json',
      )

      await whenInstall({ skills: ['keep'], agents: ['claude-code'] })

      await targetHasFiles(
        '.agents/skills/keep/SKILL.md',
        '.claude/skills/keep',
        '.cursor/skills/keep',
      )
      await targetHasNoFiles(
        '.agents/skills/drop/SKILL.md',
        '.claude/skills/drop',
        '.cursor/skills/drop',
      )
    })
  },
)
