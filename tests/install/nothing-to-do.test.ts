import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'install / nothing to do when no resources selected',
  ({ givenSource, whenInstall, targetFiles }) => {
    it('should produce no files when skills, mcps, and hooks are all empty', async () => {
      await givenSource({
        skills: [{ name: 'lint' }],
        mcps: { github: { command: 'npx', args: ['-y', '@mcp/github'] } },
      })

      await whenInstall({ skills: [], mcps: [], hooks: [], agents: ['claude-code'] })

      expect(await targetFiles()).toMatchInlineSnapshot(`
        [
          ".agents/skills/lint/SKILL.md",
          ".claude/skills/lint",
          "ai-lock.json",
        ]
      `)
    })
  },
)
