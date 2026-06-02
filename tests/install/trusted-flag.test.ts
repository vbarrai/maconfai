import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'install / --trusted marks configs as trusted',
  ({ givenSkill, whenInstall, targetFile }) => {
    it('should write trusted: true to ai-lock.json', async () => {
      await givenSkill('alpha')

      await whenInstall({
        skills: ['alpha'],
        agents: ['claude-code'],
        extraArgs: ['--trusted'],
      })

      const lock = JSON.parse(await targetFile('ai-lock.json'))
      expect(lock.skills['alpha'].trusted).toBe(true)
    })
  },
)
