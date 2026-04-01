import { it, expect } from 'vitest'
import { describeConfai } from '../../test-utils.ts'

describeConfai(
  'claude-code / install hook from hooks/ directory',
  ({ givenSource, sourceFiles, whenInstall, targetFile, targetHasFiles }) => {
    it('should install a hook from hooks/<name>/hooks.json', async () => {
      await givenSource({
        hookDirs: {
          'block-rm': {
            'claude-code': {
              PreToolUse: [
                {
                  matcher: 'Bash',
                  hooks: [{ type: 'command', command: '.claude/hooks/block-rm.sh' }],
                },
              ],
            },
          },
        },
      })

      expect(await sourceFiles()).toMatchInlineSnapshot(`
        [
          "hooks/block-rm/hooks.json",
        ]
      `)

      await whenInstall({ hooks: ['block-rm'], agents: ['claude-code'] })

      await targetHasFiles('.claude/settings.json', 'ai-lock.json')

      expect(await targetFile('.claude/settings.json')).toMatchInlineSnapshot(`
        "{
          "hooks": {
            "PreToolUse": [
              {
                "matcher": "Bash",
                "hooks": [
                  {
                    "type": "command",
                    "command": ".claude/hooks/block-rm.sh"
                  }
                ]
              }
            ]
          }
        }
        "
      `)
    })
  },
)
