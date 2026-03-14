import { it, expect } from "vitest";
import { describeConfai } from "../../test-utils.ts";

describeConfai("cursor / install multiple MCPs", ({ givenSource, sourceFiles, when, thenFile, thenFiles }) => {
  it("installs multiple MCP servers to .cursor/mcp.json with env-prefix syntax", async () => {
    await givenSource({
      mcps: {
        github: {
          command: "npx",
          args: ["-y", "@modelcontextprotocol/server-github"],
          env: { GITHUB_TOKEN: "${GITHUB_TOKEN}" },
        },
        linear: {
          command: "npx",
          args: ["-y", "mcp-remote", "https://mcp.linear.app/mcp"],
        },
      },
    });

    expect(await sourceFiles()).toMatchInlineSnapshot(`
      [
        "mcp.json",
      ]
    `);

    await when({ mcps: ["github", "linear"], agents: ["cursor"] });

    expect(await thenFiles()).toMatchInlineSnapshot(`
      [
        ".cursor/mcp.json",
      ]
    `);

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
              "GITHUB_TOKEN": "\${env:GITHUB_TOKEN}"
            }
          },
          "linear": {
            "command": "npx",
            "args": [
              "-y",
              "mcp-remote",
              "https://mcp.linear.app/mcp"
            ]
          }
        }
      }
      "
    `);
  });
});
