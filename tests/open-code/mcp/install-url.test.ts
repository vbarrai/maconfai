import { it, expect } from 'vitest'
import { describeConfai } from '../../test-utils.ts'

describeConfai(
  'open-code / install URL MCP',
  ({ givenSource, whenInstall, targetFile }) => {
    it('should install a remote MCP server with type: remote', async () => {
      await givenSource({
        mcps: {
          'remote-api': {
            url: 'https://my-server.com/mcp',
            headers: {
              Authorization: 'Bearer ${API_TOKEN}',
            },
          },
        },
      })

      await whenInstall({ mcps: ['remote-api'], agents: ['open-code'] })

      expect(await targetFile('opencode.json')).toMatchInlineSnapshot(`
      "{
        "mcp": {
          "remote-api": {
            "type": "remote",
            "url": "https://my-server.com/mcp",
            "headers": {
              "Authorization": "Bearer \${API_TOKEN}"
            }
          }
        }
      }
      "
    `)
    })
  },
)
