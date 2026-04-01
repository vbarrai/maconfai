import { it, expect } from 'vitest'
import { describeConfai, mcpGithubWithEnv } from '../../test-utils.ts'

describeConfai('open-code / env var kept bare', ({ givenSource, whenInstall, targetFile }) => {
  it('keeps ${VAR} bare in opencode.json (no translation)', async () => {
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
              "GITHUB_TOKEN": "\${GITHUB_TOKEN}",
              "GITHUB_ORG": "\${GITHUB_ORG}"
            }
          }
        }
      }
      "
    `)
  })
})
