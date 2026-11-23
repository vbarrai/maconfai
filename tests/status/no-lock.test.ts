import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'
import { statusOf } from './status-test-utils.ts'

describeConfai('status / project without ai-lock.json', ({ getSourceDir, getTargetDir }) => {
  it('should say that nothing was installed here', async () => {
    expect(await statusOf(getTargetDir(), getSourceDir())).toMatchInlineSnapshot(
      `"No ai-lock.json here: maconfai has installed nothing in this project."`,
    )
  })
})
