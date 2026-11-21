import { expect, it } from 'vitest'
import { updateLegacySkill } from './legacy-skill-test-utils.ts'

it('says why a legacy skill found for no agent cannot be updated', async () => {
  // Another skill is installed: it must not be taken for the legacy one.
  const result = await updateLegacySkill({
    'claude-code': ['another-skill'],
    cursor: ['another-skill'],
  })

  expect(result).toEqual({
    agents: undefined,
    files: {
      'claude-code': null,
      cursor: null,
      codex: null,
      'open-code': null,
    },
    logs: [
      'info: 1 update(s) available:',
      'message:   * my-skill (<source>)',
      'error: Skill my-skill: no agent recorded in ai-lock.json and none found on disk — reinstall it with --agents',
      'error: Failed: 1',
    ].join('\n'),
  })
})
