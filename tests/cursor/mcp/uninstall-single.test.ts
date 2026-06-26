import { it, expect } from 'vitest'
import { describeConfai, mcpGithub, mcpLinear } from '../../test-utils.ts'
import { uninstallMcpServers } from '../../../src/mcp.ts'

describeConfai(
  'cursor / uninstall single MCP',
  ({ givenSource, whenInstall, targetFile, getTargetDir }) => {
    it('removes one server from .cursor/mcp.json while preserving others', async () => {
      await givenSource({ mcps: { linear: mcpLinear, github: mcpGithub } })
      await whenInstall({ mcps: ['linear', 'github'], agents: ['cursor'] })

      await uninstallMcpServers(['linear'], 'cursor', { cwd: getTargetDir() })

      expect(await targetFile('.cursor/mcp.json')).toMatchInlineSnapshot(`
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
