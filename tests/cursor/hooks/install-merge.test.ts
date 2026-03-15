import { it, expect } from 'vitest'
import { describeConfai } from '../../test-utils.ts'

describeConfai('cursor / merge hooks across installs', ({ givenSource, when, targetFile }) => {
  it('second install appends new hooks without removing existing ones', async () => {
    await givenSource({
      hooks: {
        'block-rm': {
          cursor: {
            beforeShellExecution: [{ command: '.cursor/hooks/block-rm.sh', matcher: '^rm ' }],
          },
        },
      },
    })

    await when({ hooks: ['block-rm'], agents: ['cursor'] })

    await givenSource({
      hooks: {
        'format-on-edit': {
          cursor: {
            beforeShellExecution: [{ command: '.cursor/hooks/lint.sh', matcher: '^npm ' }],
          },
        },
      },
    })

    await when({ hooks: ['format-on-edit'], agents: ['cursor'] })

    expect(await targetFile('.cursor/hooks.json')).toMatchInlineSnapshot(`
      "{
        "version": 1,
        "hooks": {
          "beforeShellExecution": [
            {
              "command": ".cursor/hooks/block-rm.sh",
              "matcher": "^rm "
            },
            {
              "command": ".cursor/hooks/lint.sh",
              "matcher": "^npm "
            }
          ]
        }
      }
      "
    `)
  })
})
