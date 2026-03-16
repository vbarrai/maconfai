import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'install / lock file tracks installed skills',
  ({ givenSkill, whenInstall, targetFile }) => {
    it('should write skill entries to ai-lock.json', async () => {
      await givenSkill('alpha', 'beta')

      await whenInstall({ skills: ['alpha', 'beta'], agents: ['claude-code'] })

      const lock = JSON.parse(await targetFile('ai-lock.json'))
      const skillNames = Object.keys(lock.skills).sort()

      expect(skillNames).toMatchInlineSnapshot(`
      [
        "alpha",
        "beta",
      ]
    `)
      expect(lock.skills['alpha'].skillPath).toBe('skills/alpha')
      expect(lock.skills['beta'].skillPath).toBe('skills/beta')
    })
  },
)
