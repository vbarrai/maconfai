import { it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtemp, writeFile, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { describeConfai } from '../../test-utils.ts'

const warn = vi.hoisted(() => vi.fn())
vi.mock('@clack/prompts', async (importOriginal) => {
  const original = (await importOriginal()) as { log: Record<string, unknown> }
  return { ...original, log: { ...original.log, warn } }
})

describeConfai(
  'claude-code / no user-scope warning for an MCP server maconfai skips',
  ({ givenSource, whenInstall, getTargetDir, targetFile }) => {
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

    it('stays silent when the project already holds a hand-written entry', async () => {
      await writeFile(
        join(home, '.claude.json'),
        JSON.stringify({ mcpServers: { github: { command: 'gh-mcp' } } }),
      )
      await writeFile(
        join(getTargetDir(), '.mcp.json'),
        JSON.stringify({ mcpServers: { github: { command: 'hand-written' } } }),
      )
      await givenSource({ mcps: { github: { command: 'npx', args: ['github-mcp'] } } })

      await whenInstall({ mcps: ['github'], agents: ['claude-code'] })

      // Other warnings (e.g. "No MCP server written") are not this test's concern.
      const userScope = warn.mock.calls.filter(([m]) => String(m).includes('also defined'))
      expect(userScope).toMatchInlineSnapshot(`[]`)
      expect(await targetFile('.mcp.json')).toContain('hand-written')
    })
  },
)
