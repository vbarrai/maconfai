import { expect, it } from 'vitest'
import { updateLegacySkill, updatedSkillNamed } from './legacy-skill-test-utils.ts'

it('finds a legacy skill under its sanitized directory name', async () => {
  // The lock is keyed by the raw name; install wrote the dir as `fix-pr-ci`.
  const result = await updateLegacySkill({ codex: ['fix-pr-ci'] }, 'Fix PR CI')

  expect(result).toEqual({
    agents: ['codex'],
    files: {
      'claude-code': null,
      cursor: null,
      codex: updatedSkillNamed('Fix PR CI'),
      'open-code': null,
    },
    logs: [
      'info: 1 update(s) available:',
      'message:   * Fix PR CI (<source>)',
      'success: Updated skill: Fix PR CI',
      'success: Updated 1 item(s)',
    ].join('\n'),
  })
})
