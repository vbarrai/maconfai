import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'install / lock file tracks installed hooks',
  ({ givenSource, whenInstall, targetFile }) => {
    it('should write hook entries to ai-lock.json', async () => {
      await givenSource({
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

      await whenInstall({ hooks: ['block-rm'], agents: ['claude-code'] })

      const lock = JSON.parse(await targetFile('ai-lock.json'))
      const hookNames = Object.keys(lock.hooks)

      expect(hookNames).toMatchInlineSnapshot(`
      [
        "block-rm",
      ]
    `)
    })
  },
)
