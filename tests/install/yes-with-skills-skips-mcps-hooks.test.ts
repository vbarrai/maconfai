import { it, expect } from 'vitest'
import { describeConfai, hookBlockRm } from '../test-utils.ts'

describeConfai(
  'install / -y with --skills installs no unrequested MCP or hook',
  ({ givenSource, whenInstall, targetFile, targetFiles }) => {
    it('should install only the requested skill', async () => {
      await givenSource({
        skills: [{ name: 'alpha' }, { name: 'beta' }],
        mcpDirs: {
          github: { command: 'npx', args: ['-y', '@mcp/github'] },
        },
        hooks: hookBlockRm,
      })

      await whenInstall({ skills: ['alpha'], agents: ['claude-code'] })

      expect(await targetFiles()).toMatchInlineSnapshot(`
        [
          ".agents/skills/alpha/SKILL.md",
          ".claude/skills/alpha",
          "ai-lock.json",
        ]
      `)

      const lock = JSON.parse(await targetFile('ai-lock.json'))
      expect({
        skills: Object.keys(lock.skills),
        mcpServers: Object.keys(lock.mcpServers),
        hooks: Object.keys(lock.hooks),
      }).toMatchInlineSnapshot(`
        {
          "hooks": [],
          "mcpServers": [],
          "skills": [
            "alpha",
          ],
        }
      `)
    })
  },
)
