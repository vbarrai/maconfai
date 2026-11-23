import { it, expect } from 'vitest'
import { describeConfai, mcpGithubWithEnv } from '../../test-utils.ts'

describeConfai('codex / env vars forwarded', ({ givenSource, whenInstall, targetFile }) => {
  it('forwards KEY: ${KEY} through env_vars instead of a literal env value', async () => {
    await givenSource({
      mcps: {
        github: mcpGithubWithEnv,
      },
    })

    await whenInstall({ mcps: ['github'], agents: ['codex'] })

    expect(await targetFile('.codex/config.toml')).toMatchInlineSnapshot(`
      "[mcp_servers.github]
      command = "npx"
      args = ["-y", "@modelcontextprotocol/server-github"]
      env_vars = ["GITHUB_TOKEN", "GITHUB_ORG"]
      "
    `)
  })
})
