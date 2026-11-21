import { it, expect } from 'vitest'
import { describeConfai, hookBlockRmClaudeCode } from '../../test-utils.ts'

describeConfai(
  'codex / hook group without a codex handler',
  ({ givenSource, whenInstall, targetFiles }) => {
    it('should not create .codex/hooks.json', async () => {
      await givenSource({ hooks: hookBlockRmClaudeCode })

      await whenInstall({ hooks: ['block-rm'], agents: ['claude-code', 'codex'] })

      expect(await targetFiles()).toMatchInlineSnapshot(`
        [
          ".claude/settings.json",
          "ai-lock.json",
        ]
      `)
    })
  },
)
