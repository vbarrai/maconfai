import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'install / lock preserves skills not in --skills filter',
  ({ givenSkill, whenInstall, targetFile }) => {
    it('should keep all skills in lock when --skills filters a subset', async () => {
      await givenSkill('keep', 'other')

      await whenInstall({ agents: ['claude-code'] })

      const lockBefore = JSON.parse(await targetFile('ai-lock.json'))
      expect(Object.keys(lockBefore.skills).sort()).toEqual(['keep', 'other'])

      // Re-install with --skills=keep — 'other' should remain in lock
      await whenInstall({ skills: ['keep'], agents: ['claude-code'] })

      const lockAfter = JSON.parse(await targetFile('ai-lock.json'))
      expect(Object.keys(lockAfter.skills).sort()).toEqual(['keep', 'other'])
    })
  },
)
