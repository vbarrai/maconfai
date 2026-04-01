import { it, expect } from 'vitest'
import { describeConfai } from '../../test-utils.ts'

describeConfai(
  'claude-code / install hook dir without companion files',
  ({ givenSource, whenInstall, targetHasFiles }) => {
    it('should not create .agents/hooks/ when no companion files exist', async () => {
      await givenSource({
        hookDirs: {
          'block-rm': {
            'claude-code': {
              PreToolUse: [
                {
                  matcher: 'Bash',
                  hooks: [{ type: 'command', command: 'echo blocked' }],
                },
              ],
            },
          },
        },
      })

      await whenInstall({ hooks: ['block-rm'], agents: ['claude-code'] })

      await targetHasFiles('.claude/settings.json', 'ai-lock.json')
    })
  },
)
