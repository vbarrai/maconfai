import { it, expect } from "vitest";
import { describeConfai } from "../../test-utils.ts";

describeConfai("cursor / skip existing MCP server", ({ givenSource, sourceFiles, when, thenFile }) => {
  it("preserves existing MCP config when same name is reinstalled", async () => {
    await givenSource({
      mcps: {
        github: {
          command: "npx",
          args: ["-y", "@modelcontextprotocol/server-github"],
          env: { GITHUB_TOKEN: "${ORIGINAL_TOKEN}" },
        },
      },
    });

    expect(await sourceFiles()).toMatchInlineSnapshot(`
      [
        "mcp.json",
      ]
    `);

    await when({ mcps: ["github"], agents: ["cursor"] });

    await givenSource({
      mcps: {
        github: {
          command: "npx",
          args: ["-y", "@modelcontextprotocol/server-github"],
          env: { GITHUB_TOKEN: "${NEW_TOKEN}" },
        },
      },
    });

    await when({ mcps: ["github"], agents: ["cursor"] });

    expect(await thenFile(".cursor/mcp.json")).toMatchInlineSnapshot(`
      "{
        "mcpServers": {
          "github": {
            "command": "npx",
            "args": [
              "-y",
              "@modelcontextprotocol/server-github"
            ],
            "env": {
              "GITHUB_TOKEN": "\${env:ORIGINAL_TOKEN}"
            }
          }
        }
      }
      "
    `);
  });
});
