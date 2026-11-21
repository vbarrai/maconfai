import { it, expect } from 'vitest'
import { describeConfai, mcpLinear } from '../../test-utils.ts'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

describeConfai(
  'codex / install keeps non-MCP tables',
  ({ givenSource, whenInstall, targetFile, getTargetDir }) => {
    it('keeps every table and comment after the first [mcp_servers.*] table', async () => {
      await mkdir(join(getTargetDir(), '.codex'), { recursive: true })
      await writeFile(
        join(getTargetDir(), '.codex', 'config.toml'),
        [
          'model = "gpt-5"',
          '',
          '[mcp_servers.existing]',
          'url = "https://example.com/mcp"',
          '',
          '# Codex hooks need this flag',
          '[features]',
          'hooks = true',
          '',
          '[[skills.config]]',
          'name = "foo"',
          'enabled = false',
          '',
          '[projects."/work/repo"]',
          'trust_level = "trusted"',
          '',
        ].join('\n'),
      )

      await givenSource({ mcps: { linear: mcpLinear } })

      await whenInstall({ mcps: ['linear'], agents: ['codex'] })

      expect(await targetFile('.codex/config.toml')).toMatchInlineSnapshot(`
        "model = "gpt-5"

        [mcp_servers.existing]
        url = "https://example.com/mcp"

        [mcp_servers.linear]
        command = "npx"
        args = ["-y", "mcp-remote", "https://mcp.linear.app/mcp"]

        # Codex hooks need this flag
        [features]
        hooks = true

        [[skills.config]]
        name = "foo"
        enabled = false

        [projects."/work/repo"]
        trust_level = "trusted"
        "
      `)
    })
  },
)
