import { it, expect } from 'vitest'
import { describeConfai, mcpLinearUrl } from '../test-utils.ts'
import { guardFiles, hookGuard, statusOf } from './status-test-utils.ts'

describeConfai(
  'status / every lock entry present on disk',
  ({ givenSource, whenInstall, getSourceDir, getTargetDir }) => {
    it('should list each skill, MCP server and hook as present for each agent', async () => {
      await givenSource({
        skills: [{ name: 'alpha' }],
        mcpDirs: { linear: mcpLinearUrl },
        hookDirs: hookGuard,
        hookDirFiles: guardFiles,
      })
      await whenInstall({ agents: ['claude-code', 'cursor', 'codex'], extraArgs: ['--trusted'] })

      expect(await statusOf(getTargetDir(), getSourceDir())).toMatchInlineSnapshot(`
        "Scope: project (ai-lock.json)

        Skills (1)
          alpha
            source:  <source>
            trusted: yes
            claude-code  present  .claude/skills/alpha
            cursor       present  .cursor/skills/alpha
            codex        present  .codex/skills/alpha

        MCP servers (1)
          linear
            source:  <source>
            trusted: yes
            claude-code  present  .mcp.json
            cursor       present  .cursor/mcp.json
            codex        present  .codex/config.toml

        Hooks (1)
          guard
            source:  <source>
            trusted: yes
            claude-code  present  .claude/settings.json
            cursor       present  .cursor/hooks.json
            codex        n/a      (no handler recorded for this agent)

        Summary: 8 present, 0 missing, 0 different, 0 unknown"
      `)
    })
  },
)
