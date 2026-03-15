import { it, expect } from 'vitest'
import { describeConfai } from '../../test-utils.ts'

describeConfai(
  'claude-code / url with headers',
  ({ givenSource, sourceFiles, when, targetFile }) => {
    it('keeps env vars bare in headers', async () => {
      await givenSource({
        mcps: {
          'custom-api': {
            url: 'https://api.example.com/mcp',
            headers: {
              Authorization: 'Bearer ${API_TOKEN}',
              'X-Team-Id': '${TEAM_ID}',
            },
          },
        },
      })

      expect(await sourceFiles()).toMatchInlineSnapshot(`
      [
        "mcp.json",
      ]
    `)

      await when({ mcps: ['custom-api'], agents: ['claude-code'] })

      expect(await targetFile('.mcp.json')).toMatchInlineSnapshot(`
      "{
        "mcpServers": {
          "custom-api": {
            "url": "https://api.example.com/mcp",
            "headers": {
              "Authorization": "Bearer \${API_TOKEN}",
              "X-Team-Id": "\${TEAM_ID}"
            }
          }
        }
      }
      "
    `)
    })
  },
)
