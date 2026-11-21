import { it, expect, vi } from 'vitest'
import { stripVTControlCharacters } from 'util'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'install / --skills says which installed skills it kept',
  ({ givenSkill, whenInstall }) => {
    it('should print the installed skills it no longer removes', async () => {
      await givenSkill('alpha', 'beta', 'gamma')
      await whenInstall({ agents: ['claude-code'] })

      let output = ''
      const spy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk: any) => {
        output += String(chunk)
        return true
      })
      try {
        await whenInstall({ skills: ['alpha'], agents: ['claude-code'] })
      } finally {
        spy.mockRestore()
      }

      const kept = stripVTControlCharacters(output)
        .split('\n')
        .find((line) => line.includes('Kept'))
      expect(kept).toMatchInlineSnapshot(
        `"●  Kept 2 installed skill(s) not in --skills: beta, gamma (remove with: maconfai remove skill <name>)"`,
      )
    })
  },
)
