import { it, expect, vi } from 'vitest'
import { describeConfai, hookBlockRm, hookLintOnEdit } from '../test-utils.ts'
import { runInstall } from '../../src/install.ts'

// Interactive run: the hook list comes back with `block-rm` unchecked, every confirm says yes
vi.mock('@clack/prompts', async (importOriginal) => ({
  ...((await importOriginal()) as Record<string, unknown>),
  multiselect: async (opts: any) =>
    opts.options.map((o: any) => o.value).filter((v: any) => v !== 'block-rm'),
  confirm: async () => true,
}))

describeConfai(
  'install / unchecking a hook group removes its handlers from config',
  ({ givenSource, whenInstall, getSourceDir, getTargetDir, targetFile }) => {
    it('should remove the handlers of the hook unchecked in the interactive list', async () => {
      await givenSource({
        hooks: { ...hookBlockRm, ...hookLintOnEdit },
      })

      await whenInstall({ hooks: ['block-rm', 'lint-on-edit'], agents: ['claude-code'] })

      const before = JSON.parse(await targetFile('.claude/settings.json'))
      expect(Object.keys(before.hooks)).toEqual(['PreToolUse', 'PostToolUse'])

      const originalCwd = process.cwd()
      try {
        process.chdir(getTargetDir())
        await runInstall([getSourceDir(), '--agents=claude-code'])
      } finally {
        process.chdir(originalCwd)
      }

      expect(await targetFile('.claude/settings.json')).toMatchInlineSnapshot(`
        "{
          "hooks": {
            "PostToolUse": [
              {
                "matcher": "Edit",
                "hooks": [
                  {
                    "type": "command",
                    "command": "lint.sh"
                  }
                ]
              }
            ]
          }
        }
        "
      `)
      const lock = JSON.parse(await targetFile('ai-lock.json'))
      expect(Object.keys(lock.hooks)).toEqual(['lint-on-edit'])
    })
  },
)
