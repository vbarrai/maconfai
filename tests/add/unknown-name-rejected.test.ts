import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai('add / a name the source does not have', ({ givenSkill, whenAdd, targetFiles }) => {
  it('should fail before writing anything', async () => {
    await givenSkill('alpha', 'beta')

    await expect(
      whenAdd('skill', ['alpha', 'nope'], ['--agents=claude-code']),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: Not found in the source: nope]`)

    expect(await targetFiles()).toMatchInlineSnapshot(`[]`)
  })
})
