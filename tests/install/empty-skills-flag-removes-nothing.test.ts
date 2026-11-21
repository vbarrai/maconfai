import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'install / an empty --skills= removes nothing',
  ({ givenSkill, whenInstall, targetFile, targetHasFiles }) => {
    it('should keep every installed skill when --skills is empty', async () => {
      await givenSkill('alpha', 'beta')

      await whenInstall({ agents: ['claude-code'] })

      // `--skills=` with an empty list, e.g. to install only MCP servers or hooks
      await whenInstall({ agents: ['claude-code'], extraArgs: ['--skills='] })

      await targetHasFiles(
        '.agents/skills/alpha/SKILL.md',
        '.agents/skills/beta/SKILL.md',
        '.claude/skills/alpha',
        '.claude/skills/beta',
      )
      const lock = JSON.parse(await targetFile('ai-lock.json'))
      expect(Object.keys(lock.skills).sort()).toMatchInlineSnapshot(`
        [
          "alpha",
          "beta",
        ]
      `)
    })
  },
)
