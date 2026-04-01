import { it, expect } from 'vitest'
import { describeConfai } from '../../test-utils.ts'

describeConfai(
  'cursor / install hook dir with companion files',
  ({ givenSource, whenInstall, targetFile, targetHasFiles }) => {
    it('should copy companion files to .agents/hooks/<name>/', async () => {
      await givenSource({
        hookDirs: {
          'security-guard': {
            cursor: {
              preToolUse: [
                {
                  command: '.agents/hooks/security-guard/security-guard.sh',
                  matcher: 'Shell|Edit|Write',
                },
              ],
            },
          },
        },
        hookDirFiles: {
          'security-guard': {
            'security-guard.sh': '#!/bin/bash\necho "checking..."',
          },
        },
      })

      await whenInstall({ hooks: ['security-guard'], agents: ['cursor'] })

      await targetHasFiles(
        '.agents/hooks/security-guard/security-guard.sh',
        '.cursor/hooks.json',
        'ai-lock.json',
      )

      expect(await targetFile('.cursor/hooks.json')).toMatchInlineSnapshot(`
        "{
          "version": 1,
          "hooks": {
            "preToolUse": [
              {
                "command": ".agents/hooks/security-guard/security-guard.sh",
                "matcher": "Shell|Edit|Write"
              }
            ]
          }
        }
        "
      `)

      expect(await targetFile('.agents/hooks/security-guard/security-guard.sh'))
        .toMatchInlineSnapshot(`
        "#!/bin/bash
        echo "checking...""
      `)
    })
  },
)
