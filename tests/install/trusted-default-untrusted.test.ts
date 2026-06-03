import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'install / new configs default to non-trusted',
  ({ givenSkill, whenInstall, targetFile }) => {
    it('should write trusted: false when --trusted is absent', async () => {
      await givenSkill('alpha')

      // whenInstall always passes -y; without --trusted the default is non-trusted
      await whenInstall({ skills: ['alpha'], agents: ['claude-code'] })

      const lock = JSON.parse(await targetFile('ai-lock.json'))
      expect(lock.skills['alpha'].trusted).toBe(false)
    })
  },
)
