import { it, expect } from 'vitest'
import { describeConfai } from '../../test-utils.ts'

describeConfai('claude-code / install multiple hooks', ({ givenSource, when, targetFile }) => {
  it('should install multiple hook groups into settings.json', async () => {
    await givenSource({
      hooks: {
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
        'lint-on-edit': {
          'claude-code': {
            PostToolUse: [
              {
                matcher: 'Edit|Write',
                hooks: [{ type: 'command', command: '.claude/hooks/lint.sh' }],
              },
            ],
          },
        },
      },
    })

    await when({
      hooks: ['block-rm', 'lint-on-edit'],
      agents: ['claude-code'],
    })

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
          ],
          "PostToolUse": [
            {
              "matcher": "Edit|Write",
              "hooks": [
                {
                  "type": "command",
                  "command": ".claude/hooks/lint.sh"
                }
              ]
            }
          ]
        }
      }
      "
    `)
  })
})
