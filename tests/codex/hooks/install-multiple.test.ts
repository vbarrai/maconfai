import { it, expect } from 'vitest'
import { describeConfai, hookBlockRmCodex } from '../../test-utils.ts'

describeConfai('codex / install multiple hooks', ({ givenSource, whenInstall, targetFile }) => {
  it('should install multiple hook groups into .codex/hooks.json', async () => {
    await givenSource({
      hooks: {
        ...hookBlockRmCodex,
        'lint-on-edit': {
          codex: {
            PostToolUse: [
              {
                matcher: 'Edit|Write',
                hooks: [{ type: 'command', command: '.codex/hooks/lint.sh' }],
              },
            ],
          },
        },
      },
    })

    await whenInstall({
      hooks: ['block-rm', 'lint-on-edit'],
      agents: ['codex'],
    })

    expect(await targetFile('.codex/hooks.json')).toMatchInlineSnapshot(`
        "{
          "hooks": {
            "PreToolUse": [
              {
                "matcher": "Bash",
                "hooks": [
                  {
                    "type": "command",
                    "command": ".codex/hooks/block-rm.sh"
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
                    "command": ".codex/hooks/lint.sh"
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
