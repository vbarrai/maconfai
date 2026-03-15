import { it, expect } from 'vitest'
import { describeConfai } from '../../test-utils.ts'

describeConfai('cursor / skip duplicate hook handlers', ({ givenSource, when, targetFile }) => {
  it('does not duplicate identical handlers on reinstall', async () => {
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
    await when({ hooks: ['block-rm'], agents: ['cursor'] })

    expect(await targetFile('.cursor/hooks.json')).toMatchInlineSnapshot(`
      "{
        "version": 1,
        "hooks": {
          "beforeShellExecution": [
            {
              "command": ".cursor/hooks/block-rm.sh",
              "matcher": "^rm "
            }
          ]
        }
      }
      "
    `)
  })
})
