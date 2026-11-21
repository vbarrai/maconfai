import { it, expect } from 'vitest'
import { describeConfai, mcpLinear } from '../../test-utils.ts'

describeConfai(
  'codex / install multiple MCPs',
  ({ givenSource, whenInstall, targetFile, targetHasFiles }) => {
    it('installs multiple MCP servers to .codex/config.toml', async () => {
      await givenSource({
        mcps: {
          github: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-github'],
            env: { GITHUB_TOKEN: '${GITHUB_TOKEN}' },
          },
          linear: mcpLinear,
        },
      })

      await whenInstall({ mcps: ['github', 'linear'], agents: ['codex'] })

      await targetHasFiles('.codex/config.toml', 'ai-lock.json')

      expect(await targetFile('.codex/config.toml')).toMatchInlineSnapshot(`
      "[mcp_servers.github]
      command = "npx"
      args = ["-y", "@modelcontextprotocol/server-github"]
      env_vars = ["GITHUB_TOKEN"]

      [mcp_servers.linear]
      command = "npx"
      args = ["-y", "mcp-remote", "https://mcp.linear.app/mcp"]
      "
    `)
    })
  },
)
