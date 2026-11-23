import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'remove / an option it does not take',
  ({ givenSkill, whenAdd, whenRemove, targetFiles }) => {
    it('should fail instead of ignoring --agents and removing from every agent', async () => {
      await givenSkill('alpha')
      await whenAdd('skill', ['alpha'], ['--agents=claude-code,cursor'])
      const filesBefore = await targetFiles()

      await expect(
        whenRemove('skill', ['alpha', '--agents=cursor']),
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `[Error: Unknown option for remove: --agents=cursor]`,
      )

      expect(await targetFiles()).toEqual(filesBefore)
    })
  },
)
