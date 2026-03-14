import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import {
  translateEnvVar,
  translateServerConfig,
  installMcpServers,
  uninstallMcpServers,
} from "../src/mcp.ts";
import type { McpServerConfig } from "../src/types.ts";

describe("translateEnvVar", () => {
  it("returns value unchanged for bare syntax", () => {
    expect(translateEnvVar("${GITHUB_TOKEN}", "bare")).toBe("${GITHUB_TOKEN}");
  });

  it("converts ${VAR} to ${env:VAR} for env-prefix syntax", () => {
    expect(translateEnvVar("${GITHUB_TOKEN}", "env-prefix")).toBe(
      "${env:GITHUB_TOKEN}",
    );
  });

  it("converts ${VAR:-default} to ${env:VAR:-default}", () => {
    expect(translateEnvVar("${API_KEY:-fallback}", "env-prefix")).toBe(
      "${env:API_KEY:-fallback}",
    );
  });

  it("does not double-prefix already-prefixed ${env:VAR}", () => {
    expect(translateEnvVar("${env:ALREADY}", "env-prefix")).toBe(
      "${env:ALREADY}",
    );
  });

  it("handles strings with no variables", () => {
    expect(translateEnvVar("plain-value", "env-prefix")).toBe("plain-value");
  });

  it("handles multiple variables in one string", () => {
    expect(translateEnvVar("${A}:${B}", "env-prefix")).toBe(
      "${env:A}:${env:B}",
    );
  });
});

describe("translateServerConfig", () => {
  it("returns config unchanged for bare syntax", () => {
    const config: McpServerConfig = {
      command: "npx",
      args: ["-y", "pkg"],
      env: { TOKEN: "${TOKEN}" },
    };
    expect(translateServerConfig(config, "bare")).toEqual(config);
  });

  it("translates env values for env-prefix syntax", () => {
    const config: McpServerConfig = {
      command: "npx",
      args: ["-y", "pkg"],
      env: { TOKEN: "${TOKEN}" },
    };
    const result = translateServerConfig(config, "env-prefix");
    expect(result.env!.TOKEN).toBe("${env:TOKEN}");
    expect(result.command).toBe("npx");
    expect(result.args).toEqual(["-y", "pkg"]);
  });

  it("translates url and headers", () => {
    const config: McpServerConfig = {
      url: "https://api.example.com",
      headers: { Authorization: "Bearer ${TOKEN}" },
    };
    const result = translateServerConfig(config, "env-prefix");
    expect(result.headers!.Authorization).toBe("Bearer ${env:TOKEN}");
  });
});

describe("installMcpServers", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "mcp-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("creates config file when none exists for claude-code", async () => {
    const servers: Record<string, McpServerConfig> = {
      github: {
        command: "npx",
        args: ["-y", "@mcp/github"],
        env: { TOKEN: "${TOKEN}" },
      },
    };
    const result = await installMcpServers(servers, "claude-code", {
      cwd: tempDir,
    });
    expect(result.installed).toEqual(["github"]);
    expect(result.skipped).toEqual([]);

    const content = JSON.parse(
      await readFile(join(tempDir, ".mcp.json"), "utf-8"),
    );
    expect(content.mcpServers.github.env.TOKEN).toBe("${TOKEN}");
  });

  it("creates config file with env-prefix for cursor", async () => {
    const servers: Record<string, McpServerConfig> = {
      github: {
        command: "npx",
        args: ["-y", "@mcp/github"],
        env: { TOKEN: "${TOKEN}" },
      },
    };
    await mkdir(join(tempDir, ".cursor"), { recursive: true });
    const result = await installMcpServers(servers, "cursor", { cwd: tempDir });
    expect(result.installed).toEqual(["github"]);

    const content = JSON.parse(
      await readFile(join(tempDir, ".cursor", "mcp.json"), "utf-8"),
    );
    expect(content.mcpServers.github.env.TOKEN).toBe("${env:TOKEN}");
  });

  it("merges into existing config without overwriting", async () => {
    const existing = {
      mcpServers: { existing: { command: "node", args: ["server.js"] } },
    };
    await writeFile(join(tempDir, ".mcp.json"), JSON.stringify(existing));

    const servers: Record<string, McpServerConfig> = {
      newone: { command: "npx", args: ["-y", "new-pkg"] },
    };
    const result = await installMcpServers(servers, "claude-code", {
      cwd: tempDir,
    });
    expect(result.installed).toEqual(["newone"]);

    const content = JSON.parse(
      await readFile(join(tempDir, ".mcp.json"), "utf-8"),
    );
    expect(content.mcpServers.existing).toBeDefined();
    expect(content.mcpServers.newone).toBeDefined();
  });

  it("skips servers that already exist", async () => {
    const existing = {
      mcpServers: { github: { command: "node", args: ["old.js"] } },
    };
    await writeFile(join(tempDir, ".mcp.json"), JSON.stringify(existing));

    const servers: Record<string, McpServerConfig> = {
      github: { command: "npx", args: ["-y", "new-pkg"] },
    };
    const result = await installMcpServers(servers, "claude-code", {
      cwd: tempDir,
    });
    expect(result.installed).toEqual([]);
    expect(result.skipped).toEqual(["github"]);

    // Original config preserved
    const content = JSON.parse(
      await readFile(join(tempDir, ".mcp.json"), "utf-8"),
    );
    expect(content.mcpServers.github.args).toEqual(["old.js"]);
  });

  it("skips agents without mcpConfigPath", async () => {
    const servers: Record<string, McpServerConfig> = {
      github: { command: "npx", args: ["-y", "@mcp/github"] },
    };
    const result = await installMcpServers(servers, "codex", { cwd: tempDir });
    expect(result.installed).toEqual([]);
    expect(result.skipped).toEqual(["github"]);
  });
});

describe("uninstallMcpServers", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "mcp-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("removes specified servers from config", async () => {
    const config = {
      mcpServers: {
        github: { command: "npx", args: ["gh"] },
        postgres: { command: "npx", args: ["pg"] },
      },
    };
    await writeFile(join(tempDir, ".mcp.json"), JSON.stringify(config));

    await uninstallMcpServers(["github"], "claude-code", { cwd: tempDir });

    const content = JSON.parse(
      await readFile(join(tempDir, ".mcp.json"), "utf-8"),
    );
    expect(content.mcpServers.github).toBeUndefined();
    expect(content.mcpServers.postgres).toBeDefined();
  });

  it("handles missing config file gracefully", async () => {
    await expect(
      uninstallMcpServers(["github"], "claude-code", { cwd: tempDir }),
    ).resolves.toBeUndefined();
  });

  it("handles agent without mcpConfigPath", async () => {
    await expect(
      uninstallMcpServers(["github"], "codex", { cwd: tempDir }),
    ).resolves.toBeUndefined();
  });
});
