import { it, expect } from 'vitest'
import { describeConfai } from '../../test-utils.ts'

describeConfai(
  'codex / headers Codex cannot read from env',
  ({ givenSource, whenInstall, targetFile }) => {
    it('keeps static headers and text around ${VAR} verbatim in http_headers', async () => {
      await givenSource({
        mcps: {
          'custom-api': {
            url: 'https://api.example.com/mcp',
            headers: {
              'X-Client': 'maconfai',
              'X-Api-Key': 'Token ${API_KEY}',
              'X-Proxy-Auth': 'Bearer ${PROXY_TOKEN}',
            },
          },
        },
      })

      await whenInstall({ mcps: ['custom-api'], agents: ['codex'] })

      expect(await targetFile('.codex/config.toml')).toMatchInlineSnapshot(`
        "[mcp_servers.custom-api]
        url = "https://api.example.com/mcp"
        http_headers = { X-Client = "maconfai", X-Api-Key = "Token \${API_KEY}", X-Proxy-Auth = "Bearer \${PROXY_TOKEN}" }
        "
      `)
    })
  },
)
