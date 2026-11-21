import { it, expect } from 'vitest'
import { describeConfai } from '../../test-utils.ts'

describeConfai(
  'codex / env values Codex cannot forward',
  ({ givenSource, whenInstall, targetFile }) => {
    it('writes literal values and renamed variables verbatim in env', async () => {
      await givenSource({
        mcps: {
          github: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-github'],
            env: {
              LOG_LEVEL: 'debug',
              GITHUB_TOKEN: '${GH_TOKEN}',
              GITHUB_ORG: '${GITHUB_ORG}',
            },
          },
        },
      })

      await whenInstall({ mcps: ['github'], agents: ['codex'] })

      expect(await targetFile('.codex/config.toml')).toMatchInlineSnapshot(`
        "[mcp_servers.github]
        command = "npx"
        args = ["-y", "@modelcontextprotocol/server-github"]
        env = { LOG_LEVEL = "debug", GITHUB_TOKEN = "\${GH_TOKEN}" }
        env_vars = ["GITHUB_ORG"]
        "
      `)
    })
  },
)
