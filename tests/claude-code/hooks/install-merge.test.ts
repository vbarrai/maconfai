import { it, expect } from 'vitest'
import { describeConfai } from '../../test-utils.ts'

describeConfai('claude-code / merge hooks across installs', ({ givenSource, when, targetFile }) => {
  it('second install appends new hooks without removing existing ones', async () => {
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
      },
    })

    await when({ hooks: ['block-rm'], agents: ['claude-code'] })

    await givenSource({
      hooks: {
        'lint-on-edit': {
          'claude-code': {
            PreToolUse: [
              {
                matcher: 'Edit',
                hooks: [{ type: 'command', command: '.claude/hooks/lint.sh' }],
              },
            ],
          },
        },
      },
    })

    await when({ hooks: ['lint-on-edit'], agents: ['claude-code'] })

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
            },
            {
              "matcher": "Edit",
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
