import { it, expect, vi } from 'vitest'
import { describeConfai } from '../../test-utils.ts'

describeConfai(
  'cursor / env var with default value',
  ({ givenSource, sourceFiles, whenInstall, targetFile }) => {
    it('translates ${VAR:-default} to ${env:VAR} and warns that the default is dropped', async () => {
      await givenSource({
        mcps: {
          postgres: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-postgres'],
            env: {
              DATABASE_URL: '${DATABASE_URL:-postgresql://localhost:5432/mydb}',
            },
          },
        },
      })

      expect(await sourceFiles()).toMatchInlineSnapshot(`
      [
        "mcp.json",
      ]
    `)

      const stdout = vi.spyOn(process.stdout, 'write')
      await whenInstall({ mcps: ['postgres'], agents: ['cursor'] })
      const output = stdout.mock.calls.map(([chunk]) => String(chunk)).join('')
      stdout.mockRestore()

      expect(output).toContain(
        'MCP server postgres: Cursor has no default-value syntax, default dropped for ${env:DATABASE_URL}',
      )
      expect(await targetFile('.cursor/mcp.json')).toMatchInlineSnapshot(`
      "{
        "mcpServers": {
          "postgres": {
            "command": "npx",
            "args": [
              "-y",
              "@modelcontextprotocol/server-postgres"
            ],
            "env": {
              "DATABASE_URL": "\${env:DATABASE_URL}"
            }
          }
        }
      }
      "
    `)
    })
  },
)
