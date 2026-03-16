import { it, expect } from 'vitest'
import { describeConfai } from '../../test-utils.ts'

describeConfai(
  'cursor / install single MCP',
  ({ givenSource, sourceFiles, whenInstall, targetFile, targetFiles }) => {
    it('should install a simple mcp server', async () => {
      await givenSource({
        mcps: {
          linear: {
            command: 'npx',
            args: ['-y', 'mcp-remote', 'https://mcp.linear.app/mcp'],
          },
        },
      })

      expect(await sourceFiles()).toMatchInlineSnapshot(`
      [
        "mcp.json",
      ]
    `)

      await whenInstall({ mcps: ['linear'], agents: ['cursor'] })

      expect(await targetFiles()).toMatchInlineSnapshot(`
        [
          ".cursor/mcp.json",
          "ai-lock.json",
        ]
      `)

      expect(await targetFile('.cursor/mcp.json')).toMatchInlineSnapshot(`
      "{
        "mcpServers": {
          "linear": {
            "command": "npx",
            "args": [
              "-y",
              "mcp-remote",
              "https://mcp.linear.app/mcp"
            ]
          }
        }
      }
      "
    `)
    })
  },
)
