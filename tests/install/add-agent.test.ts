import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai('install / add a new agent', ({ givenSkill, whenInstall, targetFiles }) => {
  it('should add cursor without losing claude-code files', async () => {
    await givenSkill('shared')

    await whenInstall({ agents: ['claude-code'] })

    expect(await targetFiles()).toMatchInlineSnapshot(`
      [
        ".agents/skills/shared/SKILL.md",
        ".claude/skills/shared",
        "ai-lock.json",
      ]
    `)

    await whenInstall({ agents: ['claude-code', 'cursor'] })

    expect(await targetFiles()).toMatchInlineSnapshot(`
      [
        ".agents/skills/shared/SKILL.md",
        ".claude/skills/shared",
        ".cursor/skills/shared",
        "ai-lock.json",
      ]
    `)
  })
})
