import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'add / no --agents and no agent in the lock',
  ({ givenSkill, whenAdd, targetFiles }) => {
    it('should refuse to guess the agents and write nothing', async () => {
      await givenSkill('alpha')

      await expect(whenAdd('skill', ['alpha'])).rejects.toThrowErrorMatchingInlineSnapshot(
        `[Error: No agent recorded in ai-lock.json yet: pass --agents=claude-code,cursor,codex,open-code]`,
      )

      expect(await targetFiles()).toMatchInlineSnapshot(`[]`)
    })
  },
)
