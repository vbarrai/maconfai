import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'install / --mcps filter',
  ({ givenSource, whenInstall, targetFile, targetFiles }) => {
    it('should only install the selected MCP server', async () => {
      await givenSource({
        mcps: {
          github: { command: 'npx', args: ['-y', '@mcp/github'] },
          postgres: { command: 'npx', args: ['-y', '@mcp/pg'] },
        },
      })

      await whenInstall({ mcps: ['github'], agents: ['claude-code'] })

      expect(await targetFiles()).toMatchInlineSnapshot(`
      [
        ".mcp.json",
        "ai-lock.json",
      ]
    `)

      expect(await targetFile('.mcp.json')).toMatchInlineSnapshot(`
      "{
        "mcpServers": {
          "github": {
            "command": "npx",
            "args": [
              "-y",
              "@mcp/github"
            ]
          }
        }
      }
      "
    `)
    })
  },
)
