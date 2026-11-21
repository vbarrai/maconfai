import { it, expect } from 'vitest'
import { describeConfai, mcpLinearUrl } from '../test-utils.ts'
import { statusOf } from './status-test-utils.ts'

// Open Code keeps its servers under `mcp` in opencode.json, not under `mcpServers`.
describeConfai(
  'status / MCP server installed for Open Code',
  ({ givenSource, whenInstall, getSourceDir, getTargetDir }) => {
    it('should find the server in opencode.json', async () => {
      await givenSource({ skills: [{ name: 'alpha' }], mcpDirs: { linear: mcpLinearUrl } })
      await whenInstall({ agents: ['open-code'] })

      expect(await statusOf(getTargetDir(), getSourceDir())).toMatchInlineSnapshot(`
        "Scope: project (ai-lock.json)

        Skills (1)
          alpha
            source:  <source>
            trusted: no (blocked from update)
            open-code  present  .opencode/skills/alpha

        MCP servers (1)
          linear
            source:  <source>
            trusted: no (blocked from update)
            open-code  present  opencode.json

        Hooks (0)
          none

        Summary: 2 present, 0 missing, 0 different, 0 unknown"
      `)
    })
  },
)
