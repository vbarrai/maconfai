import { it, expect } from "vitest";
import { describeConfai } from "../../test-utils.ts";

describeConfai("claude-code / env vars kept bare", ({ givenSource, sourceFiles, when, thenFile }) => {
  it("preserves ${VAR} syntax without translation", async () => {
    await givenSource({
      mcps: {
        github: {
          command: "npx",
          args: ["-y", "@modelcontextprotocol/server-github"],
          env: {
            GITHUB_TOKEN: "${GITHUB_TOKEN}",
            GITHUB_ORG: "${GITHUB_ORG}",
          },
        },
      },
    });

    expect(await sourceFiles()).toMatchInlineSnapshot(`
      [
        "mcp.json",
      ]
    `);

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
              "GITHUB_TOKEN": "\${GITHUB_TOKEN}",
              "GITHUB_ORG": "\${GITHUB_ORG}"
            }
          }
        }
      }
      "
    `);
  });
});
