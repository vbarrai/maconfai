import { it, expect } from 'vitest'
import { describeConfai } from '../test-utils.ts'

describeConfai(
  'install / MCPs installed to multiple agents with env translation',
  ({ givenSource, whenInstall, targetFile }) => {
    it('should translate env vars for cursor but keep bare for claude-code', async () => {
      await givenSource({
        mcps: {
          github: {
            command: 'npx',
            args: ['-y', '@mcp/github'],
            env: { TOKEN: '${GITHUB_TOKEN}' },
          },
        },
      })

      await whenInstall({ mcps: ['github'], agents: ['claude-code', 'cursor'] })

      const claude = JSON.parse(await targetFile('.mcp.json'))
      expect(claude.mcpServers.github.env.TOKEN).toBe('${GITHUB_TOKEN}')

      const cursor = JSON.parse(await targetFile('.cursor/mcp.json'))
      expect(cursor.mcpServers.github.env.TOKEN).toBe('${env:GITHUB_TOKEN}')
    })
  },
)
