import { it, expect } from 'vitest'
import {
  describeConfai,
  hookBlockRm,
  hookLintOnEdit,
  mcpGithub,
  mcpLinearUrl,
} from '../test-utils.ts'

describeConfai(
  'add mcp, add hook / another one already installed from the same source',
  ({ givenSource, whenAdd, targetFile }) => {
    it('should keep it: add never removes what it does not name', async () => {
      await givenSource({
        mcpDirs: { github: mcpGithub, linear: mcpLinearUrl },
        hooks: { ...hookBlockRm, ...hookLintOnEdit },
      })
      await whenAdd('mcp', ['github'], ['--agents=claude-code'])
      await whenAdd('hook', ['block-rm'])

      await whenAdd('mcp', ['linear'])
      await whenAdd('hook', ['lint-on-edit'])

      const lock = JSON.parse(await targetFile('ai-lock.json'))
      expect([Object.keys(lock.mcpServers), Object.keys(lock.hooks)]).toMatchInlineSnapshot(`
        [
          [
            "github",
            "linear",
          ],
          [
            "block-rm",
            "lint-on-edit",
          ],
        ]
      `)
      expect(Object.keys(JSON.parse(await targetFile('.mcp.json')).mcpServers)).toEqual([
        'github',
        'linear',
      ])
      const hooks = JSON.parse(await targetFile('.claude/settings.json')).hooks
      expect(Object.keys(hooks)).toEqual(['PreToolUse', 'PostToolUse'])
    })
  },
)
