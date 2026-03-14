import { it, expect } from "vitest";
import { describeConfai } from "../../test-utils.ts";

describeConfai("claude-code / install zero MCPs", ({ givenSource, sourceFiles, when, thenFiles }) => {
  it("installs nothing when mcps is empty", async () => {
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

    await when({ mcps: [], agents: ["claude-code"] });

    expect(await thenFiles()).toMatchInlineSnapshot(`[]`);
  });
});
