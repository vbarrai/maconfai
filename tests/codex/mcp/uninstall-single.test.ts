import { it, expect } from 'vitest'
import { describeConfai, mcpGithub, mcpLinear } from '../../test-utils.ts'
import { uninstallMcpServers } from '../../../src/mcp.ts'

describeConfai(
  'codex / uninstall single MCP',
  ({ givenSource, whenInstall, targetFile, getTargetDir }) => {
    it('removes one server from config.toml while preserving others', async () => {
      await givenSource({ mcps: { linear: mcpLinear, github: mcpGithub } })
      await whenInstall({ mcps: ['linear', 'github'], agents: ['codex'] })

      await uninstallMcpServers(['linear'], 'codex', { cwd: getTargetDir() })

      expect(await targetFile('.codex/config.toml')).toMatchInlineSnapshot(`
        "[mcp_servers.github]
        command = "npx"
        args = ["-y", "@modelcontextprotocol/server-github"]
        "
      `)
    })
  },
)
