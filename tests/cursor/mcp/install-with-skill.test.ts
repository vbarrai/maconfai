import { it, expect } from "vitest";
import { describeConfai } from "../../test-utils.ts";

describeConfai("cursor / MCP alongside a skill", ({ givenSource, sourceFiles, when, thenFile, thenFiles }) => {
  it("installs both skill files and MCP config", async () => {
    await givenSource({
      skills: [{ name: "dev-tools" }],
      mcps: {
        github: {
          command: "npx",
          args: ["-y", "@modelcontextprotocol/server-github"],
          env: { GITHUB_TOKEN: "${GITHUB_TOKEN}" },
        },
      },
    });

    expect(await sourceFiles()).toMatchInlineSnapshot(`
      [
        "mcp.json",
        "skills/dev-tools/SKILL.md",
      ]
    `);

    await when({ mcps: ["github"], skills: ["dev-tools"], agents: ["cursor"] });

    expect(await thenFiles()).toMatchInlineSnapshot(`
      [
        ".agents/skills/dev-tools/SKILL.md",
        ".cursor/mcp.json",
        ".cursor/skills/dev-tools",
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
          }
        }
      }
      "
    `);
  });
});
