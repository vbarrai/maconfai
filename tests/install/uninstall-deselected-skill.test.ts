import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai('install / --skills is additive', ({ givenSkill, whenInstall, targetHasFiles }) => {
  it('should not remove skills not in --skills filter', async () => {
    await givenSkill('keep', 'other')

    await whenInstall({ agents: ['claude-code'] })

    await targetHasFiles(
      '.agents/skills/other/SKILL.md',
      '.agents/skills/keep/SKILL.md',
      '.claude/skills/other',
      '.claude/skills/keep',
    )

    await whenInstall({ skills: ['keep'], agents: ['claude-code'] })

    await targetHasFiles(
      '.agents/skills/keep/SKILL.md',
      '.claude/skills/keep',
      '.agents/skills/other/SKILL.md',
      '.claude/skills/other',
    )
  })
})
