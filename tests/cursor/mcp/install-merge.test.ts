import { it, expect } from "vitest";
import { describeConfai } from "../../test-utils.ts";

describeConfai("cursor / merge MCP servers across installs", ({ givenSource, sourceFiles, when, thenFile }) => {
  it("second install adds new MCPs without removing existing ones", async () => {
    await givenSource({
      mcps: {
        github: {
          command: "npx",
          args: ["-y", "@modelcontextprotocol/server-github"],
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
        linear: {
          command: "npx",
          args: ["-y", "mcp-remote", "https://mcp.linear.app/mcp"],
        },
      },
    });

    await when({ mcps: ["linear"], agents: ["cursor"] });

    expect(await thenFile(".cursor/mcp.json")).toMatchInlineSnapshot(`
      "{
        "mcpServers": {
          "github": {
            "command": "npx",
            "args": [
              "-y",
              "@modelcontextprotocol/server-github"
            ]
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
