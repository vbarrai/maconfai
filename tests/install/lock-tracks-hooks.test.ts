import { it, expect } from 'vitest'
import { describeConfai, hookBlockRm } from '../test-utils.ts'

describeConfai(
  'install / lock file tracks installed hooks',
  ({ givenSource, whenInstall, targetFile }) => {
    it('should write hook entries to ai-lock.json', async () => {
      await givenSource({
        hooks: hookBlockRm,
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
