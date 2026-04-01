import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'install / MCP not created for codex',
  ({ givenSource, whenInstall, targetHasFiles, targetHasNoFiles }) => {
    it('should install skill but skip MCP config for codex', async () => {
      await givenSource({
        skills: [{ name: 'with-mcp' }],
        mcpDirs: {
          github: { command: 'npx', args: ['-y', '@mcp/github'] },
        },
      })

      await whenInstall({ skills: ['with-mcp'], mcps: ['github'], agents: ['codex'] })

      await targetHasFiles('.agents/skills/with-mcp/SKILL.md', '.codex/skills/with-mcp')
      await targetHasNoFiles('.mcp.json')
    })
  },
)
