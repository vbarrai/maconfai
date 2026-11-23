import { it, expect } from 'vitest'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { describeConfai, mcpGithub } from '../test-utils.ts'

describeConfai(
  'remove mcp / a lock entry that does not record its agents',
  ({ givenSource, whenAdd, whenRemove, getTargetDir, targetFile }) => {
    it('should refuse rather than guess which configs are ours', async () => {
      await givenSource({ mcpDirs: { github: mcpGithub } })
      await whenAdd('mcp', ['github'], ['--agents=claude-code'])
      const lock = JSON.parse(await targetFile('ai-lock.json'))
      delete lock.mcpServers.github.agents
      await writeFile(join(getTargetDir(), 'ai-lock.json'), JSON.stringify(lock))
      const configBefore = await targetFile('.mcp.json')

      await expect(whenRemove('mcp', ['github'])).rejects.toThrowErrorMatchingInlineSnapshot(
        `[Error: Cannot remove github: its ai-lock.json entry does not record its agents. Reinstall it with \`maconfai add mcp\`, then remove it.]`,
      )

      expect(await targetFile('.mcp.json')).toBe(configBefore)
    })
  },
)
