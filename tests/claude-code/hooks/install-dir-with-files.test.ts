import { it, expect } from 'vitest'
import { describeConfai } from '../../test-utils.ts'

describeConfai(
  'claude-code / install hook dir with companion files',
  ({ givenSource, whenInstall, targetFile, targetHasFiles }) => {
    it('should copy companion files to .agents/hooks/<name>/', async () => {
      await givenSource({
        hookDirs: {
          'security-guard': {
            'claude-code': {
              PreToolUse: [
                {
                  matcher: 'Bash|Edit|Write',
                  hooks: [
                    {
                      type: 'command',
                      command: '.agents/hooks/security-guard/security-guard.sh',
                    },
                  ],
                },
              ],
            },
          },
        },
        hookDirFiles: {
          'security-guard': {
            'security-guard.sh': '#!/bin/bash\necho "checking..."',
            'rules.txt': 'no rm -rf',
          },
        },
      })

      await whenInstall({ hooks: ['security-guard'], agents: ['claude-code'] })

      await targetHasFiles(
        '.agents/hooks/security-guard/rules.txt',
        '.agents/hooks/security-guard/security-guard.sh',
        '.claude/settings.json',
        'ai-lock.json',
      )

      expect(await targetFile('.agents/hooks/security-guard/security-guard.sh'))
        .toMatchInlineSnapshot(`
        "#!/bin/bash
        echo "checking...""
      `)

      expect(await targetFile('.agents/hooks/security-guard/rules.txt')).toMatchInlineSnapshot(
        `"no rm -rf"`,
      )

      expect(await targetFile('.claude/settings.json')).toMatchInlineSnapshot(`
        "{
          "hooks": {
            "PreToolUse": [
              {
                "matcher": "Bash|Edit|Write",
                "hooks": [
                  {
                    "type": "command",
                    "command": ".agents/hooks/security-guard/security-guard.sh"
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
