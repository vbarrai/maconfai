import { expect, it } from 'vitest'
import { updateLegacySkill, updatedSkillNamed } from './legacy-skill-test-utils.ts'

it('updates a legacy skill installed for Codex only', async () => {
  const result = await updateLegacySkill({ codex: ['my-skill'] })

  expect(result).toEqual({
    agents: ['codex'],
    files: {
      'claude-code': null,
      cursor: null,
      codex: updatedSkillNamed('my-skill'),
      'open-code': null,
    },
    logs: [
      'info: 1 update(s) available:',
      'message:   * my-skill (<source>)',
      'success: Updated skill: my-skill',
      'success: Updated 1 item(s)',
    ].join('\n'),
  })
})
