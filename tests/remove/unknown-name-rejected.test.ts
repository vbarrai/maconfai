import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'remove / a name that is not in the lock',
  ({ givenSkill, whenAdd, whenRemove, targetFile, targetFiles }) => {
    it('should fail and change nothing, even for the valid names', async () => {
      await givenSkill('alpha', 'beta')
      await whenAdd('skill', ['alpha', 'beta'], ['--agents=claude-code'])
      const filesBefore = await targetFiles()
      const lockBefore = await targetFile('ai-lock.json')

      await expect(
        whenRemove('skill', ['alpha', 'unknown']),
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `[Error: Not in ai-lock.json: unknown (installed skills: alpha, beta)]`,
      )

      expect(await targetFiles()).toEqual(filesBefore)
      expect(await targetFile('ai-lock.json')).toBe(lockBefore)
    })
  },
)
