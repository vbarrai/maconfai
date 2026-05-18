import { it, expect } from 'vitest'
import { describeConfai, remoteRefYaml, mcpGithub } from '../test-utils.ts'

describeConfai(
  'remote ref yaml / include: [skills, mcps] pulls MCPs from the remote',
  ({ givenSource, givenRemoteSkill, whenInstall, targetHasFiles, targetFile }) => {
    it('should install both the skill and the MCP from the remote ref', async () => {
      const remoteDir = await givenRemoteSkill('lint')
      // Add an mcp.json to the remote source
      const { writeFile, mkdir } = await import('fs/promises')
      const { join } = await import('path')
      await writeFile(
        join(remoteDir, 'mcp.json'),
        JSON.stringify({ mcpServers: { github: mcpGithub } }, null, 2),
      )

      await givenSource({
        remoteRefs: {
          lint: remoteRefYaml({ source: remoteDir, include: ['skills', 'mcps'] }),
        },
      })

      await whenInstall({ agents: ['claude-code'] })

      await targetHasFiles('.agents/skills/lint/SKILL.md', '.claude/skills/lint', '.mcp.json')

      const mcp = JSON.parse(await targetFile('.mcp.json'))
      expect(mcp.mcpServers).toHaveProperty('github')
    })
  },
)
