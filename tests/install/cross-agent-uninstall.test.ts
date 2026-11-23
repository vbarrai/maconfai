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
  'install / unchecked skill removed from all agents',
  ({ givenSkill, whenInstall, getSourceDir, getTargetDir, targetHasFiles, targetHasNoFiles }) => {
    it('should remove skill from both agents even when --agents is narrowed', async () => {
      await givenSkill('keep', 'drop')

      await whenInstall({ agents: ['claude-code', 'cursor'] })

      await targetHasFiles('.claude/skills/drop', '.cursor/skills/drop')

      const originalCwd = process.cwd()
      try {
        process.chdir(getTargetDir())
        await runInstall([getSourceDir(), '--agents=claude-code'])
      } finally {
        process.chdir(originalCwd)
      }

      await targetHasFiles(
        '.agents/skills/keep/SKILL.md',
        '.claude/skills/keep',
        '.cursor/skills/keep',
      )
      await targetHasNoFiles(
        '.agents/skills/drop/SKILL.md',
        '.claude/skills/drop',
        '.cursor/skills/drop',
      )
    })
  },
)
