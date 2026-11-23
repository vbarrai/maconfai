import { it, expect } from 'vitest'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { describeConfai } from '../test-utils.ts'
import { statusOf } from './status-test-utils.ts'

// Locks written by older versions: no `agents`, `trusted` or `handlers`,
// and hand-edited agent names. `status` must describe them, never crash.
describeConfai('status / legacy lock entries', ({ getSourceDir, getTargetDir }) => {
  it('should show what the lock does not record instead of guessing', async () => {
    const target = getTargetDir()
    const legacy = { source: 'owner/hub', sourceUrl: 'https://github.com/owner/hub.git' }
    await writeFile(
      join(target, 'ai-lock.json'),
      JSON.stringify({
        version: 1,
        skills: { old: { ...legacy, skillFolderHash: 'abc' } },
        mcpServers: { linear: { ...legacy, agents: ['claude-code', 'open-code', 'vscode'] } },
        hooks: { guard: { ...legacy, trusted: false, agents: ['claude-code', 'open-code'] } },
      }),
    )
    await mkdir(join(target, '.claude'), { recursive: true })
    await writeFile(join(target, '.claude/settings.json'), '{"hooks":{}}')

    expect(await statusOf(target, getSourceDir())).toMatchInlineSnapshot(`
      "Scope: project (ai-lock.json)

      Skills (1)
        old
          source:  owner/hub
          trusted: not recorded (treated as trusted)
          agents:  not recorded

      MCP servers (1)
        linear
          source:  owner/hub
          trusted: not recorded (treated as trusted)
          claude-code  missing  .mcp.json (file not found)
          open-code    missing  opencode.json (file not found)
          vscode       unknown  (unknown agent)

      Hooks (1)
        guard
          source:  owner/hub
          trusted: no (blocked from update)
          claude-code  unknown  .claude/settings.json (lock does not record handlers)
          open-code    n/a      (agent has no hooks config)

      Summary: 0 present, 2 missing, 0 different, 2 unknown"
    `)
  })
})
