import { it, expect } from 'vitest'
import { describeConfai, remoteRefYaml, mcpGithub } from '../test-utils.ts'

describeConfai(
  'remote ref yaml / prefix applies to both skill and MCP names',
  ({ givenSource, givenRemoteSkill, whenInstall, targetHasFiles, targetFile }) => {
    it('should prefix skill directory and MCP server key', async () => {
      const remoteDir = await givenRemoteSkill('lint')
      const { writeFile } = await import('fs/promises')
      const { join } = await import('path')
      await writeFile(
        join(remoteDir, 'mcp.json'),
        JSON.stringify({ mcpServers: { github: mcpGithub } }, null, 2),
      )

      await givenSource({
        remoteRefs: {
          lint: remoteRefYaml({ source: remoteDir, include: ['skills', 'mcps'], prefix: 'acme' }),
        },
      })

      await whenInstall({ agents: ['claude-code'] })

      await targetHasFiles('.agents/skills/acme-lint/SKILL.md', '.mcp.json')

      const skillMd = await targetFile('.agents/skills/acme-lint/SKILL.md')
      expect(skillMd).toContain('name: acme-lint')

      const mcp = JSON.parse(await targetFile('.mcp.json'))
      expect(mcp.mcpServers).toHaveProperty('acme-github')
      expect(mcp.mcpServers).not.toHaveProperty('github')
    })
  },
)
