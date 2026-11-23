import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai('add / an empty --agents=', ({ givenSkill, whenAdd, targetFiles }) => {
  it('should fail instead of exiting 0 with nothing installed', async () => {
    await givenSkill('alpha')

    await expect(
      whenAdd('skill', ['alpha'], ['--agents=']),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: --agents is empty: name at least one agent, or leave it out]`,
    )

    expect(await targetFiles()).toMatchInlineSnapshot(`[]`)
  })
})
