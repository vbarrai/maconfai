import { it, expect } from 'vitest'
import { describeConfai, mcpGithubWithEnv } from '../../test-utils.ts'

describeConfai(
  'claude-code / env vars kept bare',
  ({ givenSource, sourceFiles, whenInstall, targetFile }) => {
    it('preserves ${VAR} syntax without translation', async () => {
      await givenSource({
        mcps: {
          github: mcpGithubWithEnv,
        },
      })

      expect(await sourceFiles()).toMatchInlineSnapshot(`
      [
        "mcp.json",
      ]
    `)

      await whenInstall({ mcps: ['github'], agents: ['claude-code'] })

      expect(await targetFile('.mcp.json')).toMatchInlineSnapshot(`
      "{
        "mcpServers": {
          "github": {
            "command": "npx",
            "args": [
              "-y",
              "@modelcontextprotocol/server-github"
            ],
            "env": {
              "GITHUB_TOKEN": "\${GITHUB_TOKEN}",
              "GITHUB_ORG": "\${GITHUB_ORG}"
            }
          }
        }
      }
      "
    `)
    })
  },
)
