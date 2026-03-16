import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai('install / --agents filter', ({ givenSkill, whenInstall, targetFiles }) => {
  it('should only install to the specified agent', async () => {
    await givenSkill('my-skill')

    await whenInstall({ skills: ['my-skill'], agents: ['cursor'] })

    expect(await targetFiles()).toMatchInlineSnapshot(`
      [
        ".agents/skills/my-skill/SKILL.md",
        ".cursor/skills/my-skill",
        "ai-lock.json",
      ]
    `)
  })
})
