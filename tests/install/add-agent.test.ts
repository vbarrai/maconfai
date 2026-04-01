import { it } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai('install / add a new agent', ({ givenSkill, whenInstall, targetHasFiles }) => {
  it('should add cursor without losing claude-code files', async () => {
    await givenSkill('shared')

    await whenInstall({ agents: ['claude-code'] })

    await targetHasFiles('.agents/skills/shared/SKILL.md', '.claude/skills/shared', 'ai-lock.json')

    await whenInstall({ agents: ['claude-code', 'cursor'] })

    await targetHasFiles(
      '.agents/skills/shared/SKILL.md',
      '.claude/skills/shared',
      '.cursor/skills/shared',
      'ai-lock.json',
    )
  })
})
