import { it, expect } from "vitest";
import { describeConfai } from "../../test-utils.ts";

describeConfai("cursor / url with headers and env translation", ({ givenSource, sourceFiles, when, thenFile }) => {
  it("translates env vars in headers", async () => {
    await givenSource({
      mcps: {
        "custom-api": {
          url: "https://api.example.com/mcp",
          headers: {
            Authorization: "Bearer ${API_TOKEN}",
            "X-Team-Id": "${TEAM_ID}",
          },
        },
      },
    });

    expect(await sourceFiles()).toMatchInlineSnapshot(`
      [
        "mcp.json",
      ]
    `);

    await when({ mcps: ["custom-api"], agents: ["cursor"] });

    expect(await thenFile(".cursor/mcp.json")).toMatchInlineSnapshot(`
      "{
        "mcpServers": {
          "custom-api": {
            "url": "https://api.example.com/mcp",
            "headers": {
              "Authorization": "Bearer \${env:API_TOKEN}",
              "X-Team-Id": "\${env:TEAM_ID}"
            }
          }
        }
      }
      "
    `);
  });
});
