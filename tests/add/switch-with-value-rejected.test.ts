import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai('add / a switch given a value', ({ givenSkill, whenAdd, targetFiles }) => {
  it('should reject --trusted=false instead of ignoring it', async () => {
    await givenSkill('alpha')

    await expect(
      whenAdd('skill', ['alpha'], ['--agents=claude-code', '--trusted=false']),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: Unknown option for add: --trusted=false]`)

    expect(await targetFiles()).toMatchInlineSnapshot(`[]`)
  })
})
