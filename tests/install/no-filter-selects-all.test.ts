import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'install / no filter selects all skills',
  ({ givenSkill, whenInstall, targetFiles }) => {
    it('should install all skills when no --skills filter is given', async () => {
      await givenSkill('alpha', 'beta')

      await whenInstall({ agents: ['claude-code'] })

      expect(await targetFiles()).toMatchInlineSnapshot(`
      [
        ".agents/skills/alpha/SKILL.md",
        ".agents/skills/beta/SKILL.md",
        ".claude/skills/alpha",
        ".claude/skills/beta",
        "ai-lock.json",
      ]
    `)
    })
  },
)
