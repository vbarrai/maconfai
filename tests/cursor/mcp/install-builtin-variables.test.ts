import { it, expect } from 'vitest'
import { describeConfai } from '../../test-utils.ts'

describeConfai('cursor / built-in variables', ({ givenSource, whenInstall, targetFile }) => {
  it("keeps Cursor's own variables and prefixes only environment variables", async () => {
    await givenSource({
      mcps: {
        'local-tool': {
          command: 'node',
          args: [
            '${workspaceFolder}/tools/server.js',
            '--home=${userHome}',
            '--name=${workspaceFolderBasename}',
            '--sep=${pathSeparator}${/}',
          ],
          env: {
            API_KEY: '${API_KEY}',
            ALREADY: '${env:ALREADY}',
          },
        },
      },
    })

    await whenInstall({ mcps: ['local-tool'], agents: ['cursor'] })

    expect(await targetFile('.cursor/mcp.json')).toMatchInlineSnapshot(`
      "{
        "mcpServers": {
          "local-tool": {
            "command": "node",
            "args": [
              "\${workspaceFolder}/tools/server.js",
              "--home=\${userHome}",
              "--name=\${workspaceFolderBasename}",
              "--sep=\${pathSeparator}\${/}"
            ],
            "env": {
              "API_KEY": "\${env:API_KEY}",
              "ALREADY": "\${env:ALREADY}"
            }
          }
        }
      }
      "
    `)
  })
})
