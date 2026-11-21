import { it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtemp, writeFile, rm } from 'fs/promises'
import { realpathSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { describeConfai } from '../../test-utils.ts'

const warn = vi.hoisted(() => vi.fn())
vi.mock('@clack/prompts', async (importOriginal) => {
  const original = (await importOriginal()) as { log: Record<string, unknown> }
  return { ...original, log: { ...original.log, warn } }
})

describeConfai(
  'claude-code / warn on an MCP server also defined in ~/.claude.json',
  ({ givenSource, whenInstall, getTargetDir }) => {
    let home = ''

    beforeEach(async () => {
      home = await mkdtemp(join(tmpdir(), 'home-'))
      vi.stubEnv('HOME', home)
      vi.stubEnv('CLAUDE_CONFIG_DIR', '')
      warn.mockClear()
    })
    afterEach(async () => {
      vi.unstubAllEnvs()
      await rm(home, { recursive: true, force: true })
    })

    it('names the user-scope and local-scope duplicates, not the others', async () => {
      await writeFile(
        join(home, '.claude.json'),
        JSON.stringify({
          mcpServers: { github: { command: 'gh-mcp' } },
          projects: { [realpathSync(getTargetDir())]: { mcpServers: { linear: { url: 'x' } } } },
        }),
      )
      await givenSource({
        mcps: {
          github: { command: 'npx', args: ['github-mcp'] },
          linear: { url: 'https://mcp.linear.app/sse' },
          slack: { command: 'npx', args: ['slack-mcp'] },
        },
      })

      await whenInstall({ mcps: ['github', 'linear', 'slack'], agents: ['claude-code'] })

      const target = realpathSync(getTargetDir())
      const messages = warn.mock.calls.map(([m]) =>
        String(m).replace(home, '~').replace(target, '<target>'),
      )
      expect(messages).toMatchInlineSnapshot(`
        [
          "MCP server "github" is also defined in your Claude Code user config (~/.claude.json). The two definitions can conflict: keep one of them.",
          "MCP server "linear" is also defined in your Claude Code local scope (~/.claude.json, project <target>). The two definitions can conflict: keep one of them.",
        ]
      `)
    })
  },
)
