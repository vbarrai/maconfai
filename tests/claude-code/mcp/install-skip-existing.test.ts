import { it, expect } from "vitest";
import { describeConfai } from "../../test-utils.ts";

describeConfai("claude-code / skip existing MCP server", ({ givenSource, sourceFiles, when, thenFile }) => {
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

    await when({ mcps: ["github"], agents: ["claude-code"] });

    await givenSource({
      mcps: {
        github: {
          command: "npx",
          args: ["-y", "@modelcontextprotocol/server-github"],
          env: { GITHUB_TOKEN: "${NEW_TOKEN}" },
        },
      },
    });

    await when({ mcps: ["github"], agents: ["claude-code"] });

    expect(await thenFile(".mcp.json")).toMatchInlineSnapshot(`
      "{
        "mcpServers": {
          "github": {
            "command": "npx",
            "args": [
              "-y",
              "@modelcontextprotocol/server-github"
            ],
            "env": {
              "GITHUB_TOKEN": "\${ORIGINAL_TOKEN}"
            }
          }
        }
      }
      "
    `);
  });
});
