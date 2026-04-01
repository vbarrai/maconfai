import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'install / switch from one agent to another',
  ({ givenSkill, whenInstall, targetHasFiles }) => {
    it('should add codex while keeping claude-code files', async () => {
      await givenSkill('portable')

      await whenInstall({ agents: ['claude-code'] })

      await targetHasFiles(
        '.agents/skills/portable/SKILL.md',
        '.claude/skills/portable',
        'ai-lock.json',
      )

      await whenInstall({ agents: ['codex'] })

      await targetHasFiles(
        '.agents/skills/portable/SKILL.md',
        '.claude/skills/portable',
        '.codex/skills/portable',
        'ai-lock.json',
      )
    })
  },
)
