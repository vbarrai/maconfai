import { it, expect } from 'vitest'
import { lstat } from 'fs/promises'
import { join } from 'path'
import { describeConfai, mcpLinearUrl, hookBlockRmClaudeCode } from '../../test-utils.ts'

describeConfai(
  'update / local source / an unchanged source rewrites nothing',
  ({ givenSource, whenInstall, whenUpdate, targetFiles, getTargetDir }) => {
    it('should leave every skill, MCP and hook file untouched, lock included', async () => {
      await givenSource({
        skills: [{ name: 'alpha' }],
        mcpDirs: { linear: mcpLinearUrl },
        hookDirs: hookBlockRmClaudeCode,
      })
      await whenInstall({ agents: ['claude-code'], extraArgs: ['--trusted'] })

      const mtimes = async () => {
        const files = await targetFiles()
        const stats = await Promise.all(files.map((f) => lstat(join(getTargetDir(), f))))
        return Object.fromEntries(files.map((f, i) => [f, stats[i]!.mtimeMs]))
      }
      const before = await mtimes()

      await whenUpdate()

      expect(await mtimes()).toEqual(before)
      expect(Object.keys(before)).toMatchInlineSnapshot(`
        [
          ".agents/skills/alpha/SKILL.md",
          ".claude/settings.json",
          ".claude/skills/alpha",
          ".mcp.json",
          "ai-lock.json",
        ]
      `)
    })
  },
)
