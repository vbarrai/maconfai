import { it, expect } from "vitest";
import { describeConfai } from "../../test-utils.ts";

describeConfai("cursor / env var translation", ({ givenSource, sourceFiles, when, thenFile }) => {
  it("translates ${VAR} to ${env:VAR} in env fields", async () => {
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
              "GITHUB_TOKEN": "\${env:GITHUB_TOKEN}",
              "GITHUB_ORG": "\${env:GITHUB_ORG}"
            }
          }
        }
      }
      "
    `);
  });
});
