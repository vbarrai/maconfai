import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'install / lock file tracks installed MCP servers',
  ({ givenSource, whenInstall, targetFile }) => {
    it('should write MCP entries to ai-lock.json', async () => {
      await givenSource({
        mcps: {
          github: { command: 'npx', args: ['-y', '@mcp/github'] },
          sentry: { command: 'npx', args: ['-y', '@mcp/sentry'] },
        },
      })

      await whenInstall({ mcps: ['github', 'sentry'], agents: ['claude-code'] })

      const lock = JSON.parse(await targetFile('ai-lock.json'))
      const mcpNames = Object.keys(lock.mcpServers).sort()

      expect(mcpNames).toMatchInlineSnapshot(`
        [
          "github",
          "sentry",
        ]
      `)
    })
  },
)
