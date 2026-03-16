import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'install / hooks first, then add skills on second install',
  ({ givenSource, whenInstall, targetFiles }) => {
    it('should keep hooks when adding skills', async () => {
      await givenSource({
        skills: [{ name: 'lint' }],
        hooks: {
          'block-rm': {
            'claude-code': {
              PreToolUse: [
                { matcher: 'Bash', hooks: [{ type: 'command', command: 'block-rm.sh' }] },
              ],
            },
          },
        },
      })

      // First install — hooks only, no skills
      await whenInstall({ skills: [], hooks: ['block-rm'], agents: ['claude-code'] })

      expect(await targetFiles()).toMatchInlineSnapshot(`
        [
          ".agents/skills/lint/SKILL.md",
          ".claude/settings.json",
          ".claude/skills/lint",
          "ai-lock.json",
        ]
      `)

      // Second install — add skills + keep hooks
      await whenInstall({ skills: ['lint'], hooks: ['block-rm'], agents: ['claude-code'] })

      expect(await targetFiles()).toMatchInlineSnapshot(`
        [
          ".agents/skills/lint/SKILL.md",
          ".claude/settings.json",
          ".claude/skills/lint",
          "ai-lock.json",
        ]
      `)
    })
  },
)
