import { it } from 'vitest'
import { describeConfai } from '../../test-utils.ts'

describeConfai(
  'codex / install hook dir without companion files',
  ({ givenSource, whenInstall, targetHasFiles }) => {
    it('should not create .agents/hooks/ when no companion files exist', async () => {
      await givenSource({
        hookDirs: {
          'block-rm': {
            codex: {
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

      await whenInstall({ hooks: ['block-rm'], agents: ['codex'] })

      await targetHasFiles('.codex/hooks.json', 'ai-lock.json')
    })
  },
)
