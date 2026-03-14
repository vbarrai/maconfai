import { it, expect } from "vitest";
import { describeConfai } from "../../test-utils.ts";

describeConfai("cursor / install single MCP", ({ givenSource, sourceFiles, when, thenFile, thenFiles }) => {
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

    await when({ mcps: ["linear"], agents: ["cursor"] });

    expect(await thenFiles()).toMatchInlineSnapshot(`
      [
        ".cursor/mcp.json",
      ]
    `);

    expect(await thenFile(".cursor/mcp.json")).toMatchInlineSnapshot(`
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
