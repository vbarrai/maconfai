import { it, expect } from 'vitest'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { describeConfai } from '../test-utils.ts'
import { statusOf } from './status-test-utils.ts'

// `toString` is on every object's prototype: only an own key counts as installed.
describeConfai(
  'status / MCP server named like an Object method',
  ({ getSourceDir, getTargetDir }) => {
    it('should report the server as missing from an empty config', async () => {
      const target = getTargetDir()
      const entry = { source: 'owner/hub', sourceUrl: 'https://github.com/owner/hub.git' }
      await writeFile(
        join(target, 'ai-lock.json'),
        JSON.stringify({
          version: 1,
          skills: {},
          mcpServers: { toString: { ...entry, trusted: true, agents: ['claude-code'] } },
          hooks: {},
        }),
      )
      await writeFile(join(target, '.mcp.json'), '{"mcpServers":{}}')

      expect(await statusOf(target, getSourceDir())).toMatchInlineSnapshot(`
        "Scope: project (ai-lock.json)

        Skills (0)
          none

        MCP servers (1)
          toString
            source:  owner/hub
            trusted: yes
            claude-code  missing  .mcp.json

        Hooks (0)
          none

        Summary: 0 present, 1 missing, 0 different, 0 unknown"
      `)
    })
  },
)
