import { it, expect } from "vitest";
import { describeConfai } from "../../test-utils.ts";

describeConfai("claude-code / install single MCP", ({ givenSource, sourceFiles, when, thenFile, thenFiles }) => {
  it("should install a simple mcp server", async () => {
    await givenSource({
      mcps: {
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

    await when({ mcps: ["linear"], agents: ["claude-code"] });

    expect(await thenFiles()).toMatchInlineSnapshot(`
      [
        ".mcp.json",
      ]
    `);

    expect(await thenFile(".mcp.json")).toMatchInlineSnapshot(`
      "{
        "mcpServers": {
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
