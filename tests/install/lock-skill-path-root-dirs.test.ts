import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'install / lock path of a skill sitting at the repository root',
  ({ givenSource, whenInstall, targetFile }) => {
    it('should record <name>, where the skill really is, not skills/<name>', async () => {
      await givenSource({ skills: [{ name: 'alpha' }, { name: 'beta' }], skillLayout: 'root-dirs' })

      await whenInstall({ agents: ['claude-code'] })

      const lock = JSON.parse(await targetFile('ai-lock.json'))
      expect({
        alpha: lock.skills.alpha.skillPath,
        beta: lock.skills.beta.skillPath,
      }).toMatchInlineSnapshot(`
        {
          "alpha": "alpha",
          "beta": "beta",
        }
      `)
    })
  },
)
