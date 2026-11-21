import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'install / --skills adds to the installed skills',
  ({ givenSkill, whenInstall, targetFile, targetHasFiles }) => {
    it('should keep the skills already installed from the same source', async () => {
      await givenSkill('old-a', 'old-b', 'new-c')

      await whenInstall({ skills: ['old-a', 'old-b'], agents: ['claude-code'] })

      await whenInstall({ skills: ['new-c'], agents: ['claude-code'] })

      await targetHasFiles(
        '.agents/skills/new-c/SKILL.md',
        '.agents/skills/old-a/SKILL.md',
        '.agents/skills/old-b/SKILL.md',
        '.claude/skills/new-c',
        '.claude/skills/old-a',
        '.claude/skills/old-b',
      )
      const lock = JSON.parse(await targetFile('ai-lock.json'))
      expect(Object.keys(lock.skills).sort()).toMatchInlineSnapshot(`
        [
          "new-c",
          "old-a",
          "old-b",
        ]
      `)
    })
  },
)
