import { it, expect } from 'vitest'
import { describeConfai, mcpGithub, mcpLinear } from '../../test-utils.ts'
import { uninstallMcpServers } from '../../../src/mcp.ts'

describeConfai(
  'open-code / uninstall single MCP',
  ({ givenSource, whenInstall, targetFile, getTargetDir }) => {
    it('removes one server from opencode.json while preserving others', async () => {
      await givenSource({ mcps: { linear: mcpLinear, github: mcpGithub } })
      await whenInstall({ mcps: ['linear', 'github'], agents: ['open-code'] })

      await uninstallMcpServers(['linear'], 'open-code', { cwd: getTargetDir() })

      expect(await targetFile('opencode.json')).toMatchInlineSnapshot(`
        "{
          "mcp": {
            "github": {
              "type": "local",
              "command": [
                "npx",
                "-y",
                "@modelcontextprotocol/server-github"
              ]
            }
          }
        }
        "
      `)
    })
  },
)
