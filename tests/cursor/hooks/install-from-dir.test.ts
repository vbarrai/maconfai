import { it, expect } from 'vitest'
import { describeConfai } from '../../test-utils.ts'

describeConfai(
  'cursor / install hook from hooks/ directory',
  ({ givenSource, sourceFiles, whenInstall, targetFile, targetHasFiles }) => {
    it('should install a hook from hooks/<name>/hooks.json', async () => {
      await givenSource({
        hookDirs: {
          'format-on-edit': {
            cursor: {
              afterFileEdit: [{ command: '.cursor/hooks/format.sh', matcher: 'Write' }],
            },
          },
        },
      })

      expect(await sourceFiles()).toMatchInlineSnapshot(`
        [
          "hooks/format-on-edit/hooks.json",
        ]
      `)

      await whenInstall({ hooks: ['format-on-edit'], agents: ['cursor'] })

      await targetHasFiles('.cursor/hooks.json', 'ai-lock.json')

      expect(await targetFile('.cursor/hooks.json')).toMatchInlineSnapshot(`
        "{
          "version": 1,
          "hooks": {
            "afterFileEdit": [
              {
                "command": ".cursor/hooks/format.sh",
                "matcher": "Write"
              }
            ]
          }
        }
        "
      `)
    })
  },
)
