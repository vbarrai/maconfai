import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'remove skill / removes only the named skill',
  ({ givenSkill, whenAdd, whenRemove, targetFile, targetFiles }) => {
    it('should remove the skill from every agent and the lock, and keep the others', async () => {
      await givenSkill('alpha', 'beta', 'gamma')
      await whenAdd('skill', ['alpha', 'beta', 'gamma'], ['--agents=claude-code,cursor,codex'])

      await whenRemove('skill', ['beta'])

      expect(await targetFiles()).toMatchInlineSnapshot(`
        [
          ".agents/skills/alpha/SKILL.md",
          ".agents/skills/gamma/SKILL.md",
          ".claude/skills/alpha",
          ".claude/skills/gamma",
          ".codex/skills/alpha",
          ".codex/skills/gamma",
          ".cursor/skills/alpha",
          ".cursor/skills/gamma",
          "ai-lock.json",
        ]
      `)
      const lock = JSON.parse(await targetFile('ai-lock.json'))
      expect(Object.keys(lock.skills)).toMatchInlineSnapshot(`
        [
          "alpha",
          "gamma",
        ]
      `)
    })
  },
)
