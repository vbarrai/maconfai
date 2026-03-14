import { it, expect } from "vitest";
import { describeConfai } from "../../test-utils.ts";

describeConfai("cursor / url-based MCP (SSE transport)", ({ givenSource, sourceFiles, when, thenFile }) => {
  it("installs MCP with url instead of command", async () => {
    await givenSource({
      mcps: {
        linear: {
          url: "https://mcp.linear.app/sse",
        },
      },
    });

    expect(await sourceFiles()).toMatchInlineSnapshot(`
      [
        "mcp.json",
      ]
    `);

    await when({ mcps: ["linear"], agents: ["cursor"] });

    expect(await thenFile(".cursor/mcp.json")).toMatchInlineSnapshot(`
      "{
        "mcpServers": {
          "linear": {
            "url": "https://mcp.linear.app/sse"
          }
        }
      }
      "
    `);
  });
});
