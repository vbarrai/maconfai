import { it, vi } from 'vitest'
import { describeConfai } from '../test-utils.ts'
import { runInstall } from '../../src/install.ts'

// Interactive run: the skill list comes back with `drop` unchecked, every confirm says yes
vi.mock('@clack/prompts', async (importOriginal) => ({
  ...((await importOriginal()) as Record<string, unknown>),
  multiselect: async (opts: any) =>
    opts.options.map((o: any) => o.value).filter((v: any) => v.name !== 'drop'),
  confirm: async () => true,
}))

describeConfai(
  'install / unchecking a skill removes it',
  ({ givenSkill, whenInstall, getSourceDir, getTargetDir, targetHasFiles, targetHasNoFiles }) => {
    it('should remove the skill unchecked in the interactive list', async () => {
      await givenSkill('keep', 'drop')

      await whenInstall({ agents: ['claude-code'] })

      await targetHasFiles('.agents/skills/drop/SKILL.md', '.claude/skills/drop')

      const originalCwd = process.cwd()
      try {
        process.chdir(getTargetDir())
        await runInstall([getSourceDir(), '--agents=claude-code'])
      } finally {
        process.chdir(originalCwd)
      }

      await targetHasFiles('.agents/skills/keep/SKILL.md', '.claude/skills/keep')
      await targetHasNoFiles('.agents/skills/drop/SKILL.md', '.claude/skills/drop')
    })
  },
)
