import { it, expect } from 'vitest'
import { describeConfai, mcpLinear } from '../../test-utils.ts'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

describeConfai(
  'codex / reinstall replaces an owned server in place',
  ({ givenSource, whenInstall, targetFile, getTargetDir }) => {
    it('rewrites only the owned server, keeping its comment and the tables around it', async () => {
      await givenSource({ mcps: { linear: mcpLinear } })
      await whenInstall({ mcps: ['linear'], agents: ['codex'] })

      const configPath = join(getTargetDir(), '.codex', 'config.toml')
      const installed = await readFile(configPath, 'utf-8')
      await writeFile(
        configPath,
        [
          'model = "gpt-5"',
          '',
          '# Linear, managed by maconfai',
          installed.trim(),
          '',
          '[features]',
          'hooks = true',
          '',
        ].join('\n'),
      )
      const before = await targetFile('.codex/config.toml')

      await whenInstall({ mcps: ['linear'], agents: ['codex'] })

      expect(await targetFile('.codex/config.toml')).toBe(before)
      expect(before).toMatchInlineSnapshot(`
        "model = "gpt-5"

        # Linear, managed by maconfai
        [mcp_servers.linear]
        command = "npx"
        args = ["-y", "mcp-remote", "https://mcp.linear.app/mcp"]

        [features]
        hooks = true
        "
      `)
    })
  },
)
