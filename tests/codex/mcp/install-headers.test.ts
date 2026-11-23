import { it, expect } from 'vitest'
import { describeConfai, mcpCustomApi } from '../../test-utils.ts'

describeConfai('codex / url with headers', ({ givenSource, whenInstall, targetFile }) => {
  it('maps Authorization: Bearer ${VAR} to bearer_token_env_var and ${VAR} headers to env_http_headers', async () => {
    await givenSource({
      mcps: {
        'custom-api': mcpCustomApi,
      },
    })

    await whenInstall({ mcps: ['custom-api'], agents: ['codex'] })

    expect(await targetFile('.codex/config.toml')).toMatchInlineSnapshot(`
      "[mcp_servers.custom-api]
      url = "https://api.example.com/mcp"
      bearer_token_env_var = "API_TOKEN"
      env_http_headers = { X-Team-Id = "TEAM_ID" }
      "
    `)
  })
})
