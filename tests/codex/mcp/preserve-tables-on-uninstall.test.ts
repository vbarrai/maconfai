import { it, expect } from 'vitest'
import { describeConfai, mcpLinear } from '../../test-utils.ts'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { uninstallMcpServers } from '../../../src/mcp.ts'

describeConfai(
  'codex / uninstall keeps non-MCP tables',
  ({ givenSource, whenInstall, targetFile, getTargetDir }) => {
    it('removes only the uninstalled server, sub-tables of other servers included', async () => {
      await mkdir(join(getTargetDir(), '.codex'), { recursive: true })
      await writeFile(
        join(getTargetDir(), '.codex', 'config.toml'),
        [
          '[mcp_servers.existing]',
          'command = "my-server"',
          '',
          '[mcp_servers.existing.env]',
          'LOG_LEVEL = "debug"',
          '',
          '[features]',
          'hooks = true',
          '',
          '[[skills.config]]',
          'name = "foo"',
          'enabled = false',
          '',
        ].join('\n'),
      )

      await givenSource({ mcps: { linear: mcpLinear } })
      await whenInstall({ mcps: ['linear'], agents: ['codex'] })

      expect(await targetFile('.codex/config.toml')).toMatchInlineSnapshot(`
        "[mcp_servers.existing]
        command = "my-server"

        [mcp_servers.existing.env]
        LOG_LEVEL = "debug"

        [mcp_servers.linear]
        command = "npx"
        args = ["-y", "mcp-remote", "https://mcp.linear.app/mcp"]

        [features]
        hooks = true

        [[skills.config]]
        name = "foo"
        enabled = false
        "
      `)

      await uninstallMcpServers(['linear'], 'codex', { cwd: getTargetDir() })

      expect(await targetFile('.codex/config.toml')).toMatchInlineSnapshot(`
        "[mcp_servers.existing]
        command = "my-server"

        [mcp_servers.existing.env]
        LOG_LEVEL = "debug"

        [features]
        hooks = true

        [[skills.config]]
        name = "foo"
        enabled = false
        "
      `)
    })
  },
)
