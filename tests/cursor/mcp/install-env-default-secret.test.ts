import { it, expect, vi } from 'vitest'
import { describeConfai } from '../../test-utils.ts'

describeConfai(
  'cursor / env var default never printed',
  ({ givenSource, whenInstall, targetFile }) => {
    it('names only the variable in the warning, never its default value', async () => {
      const secret = 's3cr3t-p4ssw0rd'
      await givenSource({
        mcps: {
          postgres: {
            command: 'npx',
            env: {
              DATABASE_URL: `\${DATABASE_URL:-postgresql://admin:${secret}@db.example.com:5432/prod}`,
            },
          },
        },
      })

      const stdout = vi.spyOn(process.stdout, 'write')
      const stderr = vi.spyOn(process.stderr, 'write')
      await whenInstall({ mcps: ['postgres'], agents: ['cursor'] })
      const output = [...stdout.mock.calls, ...stderr.mock.calls]
        .map(([chunk]) => String(chunk))
        .join('')
      stdout.mockRestore()
      stderr.mockRestore()

      expect(output).toContain(
        'MCP server postgres: Cursor has no default-value syntax, default dropped for ${env:DATABASE_URL}',
      )
      expect(output).not.toContain(secret)
      expect(await targetFile('.cursor/mcp.json')).not.toContain(secret)
    })
  },
)
