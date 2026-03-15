import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'install / lock file tracks skills + MCPs + hooks together',
  ({ givenSource, whenInstall, targetFile }) => {
    it('should write all three sections to ai-lock.json', async () => {
      await givenSource({
        skills: [{ name: 'lint' }],
        mcps: { github: { command: 'npx', args: ['-y', '@mcp/github'] } },
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

      await whenInstall({
        skills: ['lint'],
        mcps: ['github'],
        hooks: ['block-rm'],
        agents: ['claude-code'],
      })

      const lock = JSON.parse(await targetFile('ai-lock.json'))

      expect(Object.keys(lock.skills)).toMatchInlineSnapshot(`
        [
          "lint",
        ]
      `)
      expect(Object.keys(lock.mcpServers)).toMatchInlineSnapshot(`
        [
          "github",
        ]
      `)
      expect(Object.keys(lock.hooks)).toMatchInlineSnapshot(`
        [
          "block-rm",
        ]
      `)
    })
  },
)
