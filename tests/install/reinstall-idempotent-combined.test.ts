import { it, expect } from 'vitest'
import type { AgentType } from '../../src/types.ts'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'install / reinstall of skills + MCPs + hooks is idempotent',
  ({ givenSource, whenInstall, targetFile, targetFiles }) => {
    it('should produce identical state on second install', async () => {
      await givenSource({
        skills: [{ name: 'lint' }],
        mcps: { github: { command: 'npx', args: ['-y', '@mcp/github'] } },
        hooks: {
          'block-rm': {
            'claude-code': {
              PreToolUse: [
                { matcher: 'Bash', hooks: [{ type: 'command', command: 'block-rm.sh' }] },
              ],
            },
          },
        },
      })

      const opts = {
        skills: ['lint'],
        mcps: ['github'],
        hooks: ['block-rm'],
        agents: ['claude-code'] as AgentType[],
      }

      await whenInstall(opts)
      const firstFiles = await targetFiles()
      const firstMcp = await targetFile('.mcp.json')
      const firstHooks = await targetFile('.claude/settings.json')

      await whenInstall(opts)
      const secondFiles = await targetFiles()
      const secondMcp = await targetFile('.mcp.json')
      const secondHooks = await targetFile('.claude/settings.json')

      expect(secondFiles).toEqual(firstFiles)
      expect(secondMcp).toEqual(firstMcp)
      expect(secondHooks).toEqual(firstHooks)
    })
  },
)
