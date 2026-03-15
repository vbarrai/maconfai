import { it, expect } from 'vitest'
import { describeConfai } from '../../test-utils.ts'

describeConfai('cursor / install multiple hooks', ({ givenSource, when, targetFile }) => {
  it('should install multiple hook groups into hooks.json', async () => {
    await givenSource({
      hooks: {
        'block-rm': {
          cursor: {
            beforeShellExecution: [{ command: '.cursor/hooks/block-rm.sh', matcher: '^rm ' }],
          },
        },
        'format-on-edit': {
          cursor: {
            afterFileEdit: [{ command: '.cursor/hooks/format.sh', matcher: 'Write' }],
          },
        },
      },
    })

    await when({ hooks: ['block-rm', 'format-on-edit'], agents: ['cursor'] })

    expect(await targetFile('.cursor/hooks.json')).toMatchInlineSnapshot(`
      "{
        "version": 1,
        "hooks": {
          "beforeShellExecution": [
            {
              "command": ".cursor/hooks/block-rm.sh",
              "matcher": "^rm "
            }
          ],
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
})
