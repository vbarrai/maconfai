import { it, expect } from 'vitest'
import { describeConfai, mcpGithub } from '../test-utils.ts'

describeConfai(
  'add skill / adds only the named skill',
  ({ givenSource, whenAdd, targetFile, targetFiles }) => {
    it('should keep the installed skills and add no MCP server or hook', async () => {
      await givenSource({
        skills: [{ name: 'alpha' }, { name: 'beta' }, { name: 'gamma' }],
        mcps: { github: mcpGithub },
        hookDirs: {
          guard: {
            'claude-code': {
              PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'echo' }] }],
            },
          },
        },
      })
      await whenAdd('skill', ['alpha', 'gamma'], ['--agents=claude-code'])

      await whenAdd('skill', ['beta'])

      expect(await targetFiles()).toMatchInlineSnapshot(`
        [
          ".agents/skills/alpha/SKILL.md",
          ".agents/skills/beta/SKILL.md",
          ".agents/skills/gamma/SKILL.md",
          ".claude/skills/alpha",
          ".claude/skills/beta",
          ".claude/skills/gamma",
          "ai-lock.json",
        ]
      `)
      const lock = JSON.parse(await targetFile('ai-lock.json'))
      expect([lock.skills.beta.agents, Object.keys(lock.mcpServers), Object.keys(lock.hooks)])
        .toMatchInlineSnapshot(`
          [
            [
              "claude-code",
            ],
            [],
            [],
          ]
        `)
    })
  },
)
