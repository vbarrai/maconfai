import { it, expect } from "vitest";
import { describeConfai } from "../../test-utils.ts";

describeConfai("cursor / env var with default value", ({ givenSource, sourceFiles, when, thenFile }) => {
  it("translates ${VAR:-default} to ${env:VAR:-default}", async () => {
    await givenSource({
      mcps: {
        postgres: {
          command: "npx",
          args: ["-y", "@modelcontextprotocol/server-postgres"],
          env: {
            DATABASE_URL: "${DATABASE_URL:-postgresql://localhost:5432/mydb}",
          },
        },
      },
    });

    expect(await sourceFiles()).toMatchInlineSnapshot(`
      [
        "mcp.json",
      ]
    `);

    await when({ mcps: ["postgres"], agents: ["cursor"] });

    expect(await thenFile(".cursor/mcp.json")).toMatchInlineSnapshot(`
      "{
        "mcpServers": {
          "postgres": {
            "command": "npx",
            "args": [
              "-y",
              "@modelcontextprotocol/server-postgres"
            ],
            "env": {
              "DATABASE_URL": "\${env:DATABASE_URL:-postgresql://localhost:5432/mydb}"
            }
          }
        }
      }
      "
    `);
  });
});
