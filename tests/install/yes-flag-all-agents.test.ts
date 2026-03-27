import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'install / -y installs to all agents',
  ({ givenSkill, whenInstall, targetFiles }) => {
    it('should install skills to all agents when no filters given', async () => {
      await givenSkill('skill-x', 'skill-y')

      await whenInstall({})

      expect(await targetFiles()).toMatchInlineSnapshot(`
      [
        ".agents/skills/skill-x/SKILL.md",
        ".agents/skills/skill-y/SKILL.md",
        ".claude/skills/skill-x",
        ".claude/skills/skill-y",
        ".codex/skills/skill-x",
        ".codex/skills/skill-y",
        ".cursor/skills/skill-x",
        ".cursor/skills/skill-y",
        ".opencode/skills/skill-x",
        ".opencode/skills/skill-y",
        "ai-lock.json",
      ]
    `)
    })
  },
)
