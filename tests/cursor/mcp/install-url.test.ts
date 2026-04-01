import { it, expect } from 'vitest'
import { describeConfai, mcpLinearUrl } from '../../test-utils.ts'

describeConfai(
  'cursor / url-based MCP (SSE transport)',
  ({ givenSource, sourceFiles, whenInstall, targetFile }) => {
    it('installs MCP with url instead of command', async () => {
      await givenSource({
        mcps: {
          linear: mcpLinearUrl,
        },
      })

      expect(await sourceFiles()).toMatchInlineSnapshot(`
      [
        "mcp.json",
      ]
    `)

      await whenInstall({ mcps: ['linear'], agents: ['cursor'] })

      expect(await targetFile('.cursor/mcp.json')).toMatchInlineSnapshot(`
      "{
        "mcpServers": {
          "linear": {
            "url": "https://mcp.linear.app/sse"
          }
        }
      }
      "
    `)
    })
  },
)
