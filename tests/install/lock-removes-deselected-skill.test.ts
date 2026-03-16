import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'install / lock removes deselected skills',
  ({ givenSkill, whenInstall, targetFile }) => {
    it('should remove skill from lock when deselected', async () => {
      await givenSkill('keep', 'drop')

      await whenInstall({ agents: ['claude-code'] })

      const lockBefore = JSON.parse(await targetFile('ai-lock.json'))
      expect(Object.keys(lockBefore.skills).sort()).toMatchInlineSnapshot(`
        [
          "drop",
          "keep",
        ]
      `)

      // Re-install without 'drop'
      await whenInstall({ skills: ['keep'], agents: ['claude-code'] })

      const lockAfter = JSON.parse(await targetFile('ai-lock.json'))
      expect(Object.keys(lockAfter.skills)).toMatchInlineSnapshot(`
        [
          "keep",
        ]
      `)
    })
  },
)
