import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'install / single skill to all agents',
  ({ givenSkill, whenInstall, targetHasFiles }) => {
    it('should install one skill to claude-code, cursor, and codex', async () => {
      await givenSkill('shared')

      await whenInstall({ skills: ['shared'], agents: ['claude-code', 'cursor', 'codex'] })

      await targetHasFiles(
        '.agents/skills/shared/SKILL.md',
        '.claude/skills/shared',
        '.codex/skills/shared',
        '.cursor/skills/shared',
        'ai-lock.json',
      )
    })
  },
)
