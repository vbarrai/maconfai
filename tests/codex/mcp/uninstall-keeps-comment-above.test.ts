import { it, expect } from 'vitest'
import { describeConfai, mcpLinear } from '../../test-utils.ts'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { uninstallMcpServers } from '../../../src/mcp.ts'

describeConfai(
  'codex / uninstall keeps comments above the server',
  ({ givenSource, whenInstall, targetFile, getTargetDir }) => {
    it('keeps a comment the user wrote right above an installed server', async () => {
      await givenSource({ mcps: { linear: mcpLinear } })
      await whenInstall({ mcps: ['linear'], agents: ['codex'] })

      const configPath = join(getTargetDir(), '.codex', 'config.toml')
      const installed = await readFile(configPath, 'utf-8')
      await writeFile(
        configPath,
        `model = "gpt-5"\n\n# keep this setting documented\n${installed}\n[features]\nhooks = true\n`,
      )

      await uninstallMcpServers(['linear'], 'codex', { cwd: getTargetDir() })

      expect(await targetFile('.codex/config.toml')).toMatchInlineSnapshot(`
        "model = "gpt-5"

        # keep this setting documented

        [features]
        hooks = true
        "
      `)
    })
  },
)
