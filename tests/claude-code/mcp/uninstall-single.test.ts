import { it, expect } from 'vitest'
import { describeConfai, mcpGithub, mcpLinear } from '../../test-utils.ts'
import { uninstallMcpServers } from '../../../src/mcp.ts'

describeConfai(
  'claude-code / uninstall single MCP',
  ({ givenSource, whenInstall, targetFile, getTargetDir }) => {
    it('removes one server from .mcp.json while preserving others', async () => {
      await givenSource({ mcps: { linear: mcpLinear, github: mcpGithub } })
      await whenInstall({ mcps: ['linear', 'github'], agents: ['claude-code'] })

      await uninstallMcpServers(['linear'], 'claude-code', { cwd: getTargetDir() })

      expect(await targetFile('.mcp.json')).toMatchInlineSnapshot(`
        "{
          "mcpServers": {
            "github": {
              "command": "npx",
              "args": [
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
