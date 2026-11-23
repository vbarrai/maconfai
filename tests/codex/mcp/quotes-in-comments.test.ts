import { it, expect } from 'vitest'
import { describeConfai, mcpLinear } from '../../test-utils.ts'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { uninstallMcpServers } from '../../../src/mcp.ts'

describeConfai(
  'codex / triple quotes outside a string',
  ({ givenSource, whenInstall, targetFile, getTargetDir }) => {
    it('does not take """ in a comment, a string or an escape for a multiline string', async () => {
      const seed = [
        'model = "gpt-5" # docstrings use """',
        'instructions = """',
        '[not_a_table]',
        'use \\""" carefully',
        '"""',
        `pattern = 'say """ here'`,
        '',
        '[features]',
        'hooks = true',
        '',
      ].join('\n')
      await mkdir(join(getTargetDir(), '.codex'), { recursive: true })
      await writeFile(join(getTargetDir(), '.codex', 'config.toml'), seed)

      await givenSource({ mcps: { linear: mcpLinear } })
      await whenInstall({ mcps: ['linear'], agents: ['codex'] })

      expect(await targetFile('.codex/config.toml')).toMatchInlineSnapshot(`
        "model = "gpt-5" # docstrings use """
        instructions = """
        [not_a_table]
        use \\""" carefully
        """
        pattern = 'say """ here'

        [features]
        hooks = true

        [mcp_servers.linear]
        command = "npx"
        args = ["-y", "mcp-remote", "https://mcp.linear.app/mcp"]
        "
      `)

      await uninstallMcpServers(['linear'], 'codex', { cwd: getTargetDir() })

      expect(await targetFile('.codex/config.toml')).toBe(seed)
    })
  },
)
