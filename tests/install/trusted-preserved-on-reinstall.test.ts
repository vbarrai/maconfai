import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'install / reinstall preserves existing trust',
  ({ givenSkill, whenInstall, targetFile }) => {
    it('should keep trusted: true on a -y reinstall without --trusted', async () => {
      await givenSkill('alpha')

      // First install marks the skill as trusted
      await whenInstall({ skills: ['alpha'], agents: ['claude-code'], extraArgs: ['--trusted'] })
      expect(JSON.parse(await targetFile('ai-lock.json')).skills['alpha'].trusted).toBe(true)

      // Reinstalling with -y (no --trusted) must not silently revoke trust
      await whenInstall({ skills: ['alpha'], agents: ['claude-code'] })

      const lock = JSON.parse(await targetFile('ai-lock.json'))
      expect(lock.skills['alpha'].trusted).toBe(true)
    })
  },
)
