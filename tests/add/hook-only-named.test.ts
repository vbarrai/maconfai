import { it, expect } from 'vitest'
import { describeConfai, mcpGithub } from '../test-utils.ts'

const handler = (command: string) => ({
  'claude-code': {
    PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command }] }],
  },
})

describeConfai(
  'add hook / adds only the named hook',
  ({ givenSource, whenAdd, targetFile, targetFiles }) => {
    it('should install the named hook with its companion files and nothing else', async () => {
      await givenSource({
        skills: [{ name: 'alpha' }],
        mcps: { github: mcpGithub },
        hookDirs: { guard: handler('sh .agents/hooks/guard/guard.sh'), other: handler('echo') },
        hookDirFiles: { guard: { 'guard.sh': '#!/bin/sh\n' } },
      })

      await whenAdd('hook', ['guard'], ['--agents=claude-code'])

      expect(await targetFiles()).toMatchInlineSnapshot(`
        [
          ".agents/hooks/guard/guard.sh",
          ".claude/settings.json",
          "ai-lock.json",
        ]
      `)
      expect(await targetFile('.claude/settings.json')).toMatchInlineSnapshot(`
        "{
          "hooks": {
            "PreToolUse": [
              {
                "matcher": "Bash",
                "hooks": [
                  {
                    "type": "command",
                    "command": "sh .agents/hooks/guard/guard.sh"
                  }
                ]
              }
            ]
          }
        }
        "
      `)
      const lock = JSON.parse(await targetFile('ai-lock.json'))
      expect(Object.keys(lock.hooks)).toMatchInlineSnapshot(`
        [
          "guard",
        ]
      `)
    })
  },
)
