import { it, expect } from 'vitest'
import { describeConfai, hookBlockRm, mcpGithub } from '../test-utils.ts'

describeConfai(
  'add skill / an MCP server and a hook already installed from the same source',
  ({ givenSource, whenInstall, whenAdd, targetFile, targetFiles }) => {
    it('should add the skill and remove neither of them', async () => {
      await givenSource({
        skills: [{ name: 'alpha' }],
        mcpDirs: { github: mcpGithub },
        hooks: hookBlockRm,
      })
      await whenInstall({ mcps: ['github'], hooks: ['block-rm'], agents: ['claude-code'] })

      await whenAdd('skill', ['alpha'])

      expect(await targetFiles()).toMatchInlineSnapshot(`
        [
          ".agents/skills/alpha/SKILL.md",
          ".claude/settings.json",
          ".claude/skills/alpha",
          ".mcp.json",
          "ai-lock.json",
        ]
      `)
      const lock = JSON.parse(await targetFile('ai-lock.json'))
      expect([Object.keys(lock.skills), Object.keys(lock.mcpServers), Object.keys(lock.hooks)])
        .toMatchInlineSnapshot(`
          [
            [
              "alpha",
            ],
            [
              "github",
            ],
            [
              "block-rm",
            ],
          ]
        `)
      expect(Object.keys(JSON.parse(await targetFile('.mcp.json')).mcpServers)).toEqual(['github'])
      expect(await targetFile('.claude/settings.json')).toContain('block-rm.sh')
    })
  },
)
