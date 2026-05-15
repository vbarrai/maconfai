import { it, expect } from 'vitest'
import { describeConfai, mcpGithubWithEnv } from '../../test-utils.ts'

describeConfai(
  'open-code / env var translated to {env:VAR}',
  ({ givenSource, whenInstall, targetFile }) => {
    it('translates ${VAR} to {env:VAR} in opencode.json', async () => {
      await givenSource({
        mcps: {
          github: mcpGithubWithEnv,
        },
      })

      await whenInstall({ mcps: ['github'], agents: ['open-code'] })

      expect(await targetFile('opencode.json')).toMatchInlineSnapshot(`
        "{
          "mcp": {
            "github": {
              "type": "local",
              "command": [
                "npx",
                "-y",
                "@modelcontextprotocol/server-github"
              ],
              "environment": {
                "GITHUB_TOKEN": "{env:GITHUB_TOKEN}",
                "GITHUB_ORG": "{env:GITHUB_ORG}"
              }
            }
          }
        }
        "
      `)
    })
  },
)
