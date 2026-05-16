import { it } from 'vitest'
import { describeConfai } from '../../test-utils.ts'

describeConfai(
  'cursor / install hook dir without companion files',
  ({ givenSource, whenInstall, targetHasFiles, targetHasNoFiles }) => {
    it('should not create .agents/hooks/ when no companion files exist', async () => {
      await givenSource({
        hookDirs: {
          'block-rm': {
            cursor: {
              beforeShellExecution: [
                {
                  command: 'block-rm.sh',
                  matcher: '^rm ',
                },
              ],
            },
          },
        },
      })

      await whenInstall({ hooks: ['block-rm'], agents: ['cursor'] })

      await targetHasFiles('.cursor/hooks.json', 'ai-lock.json')
      await targetHasNoFiles('.agents/hooks/block-rm')
    })
  },
)
