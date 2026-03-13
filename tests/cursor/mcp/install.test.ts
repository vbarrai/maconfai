import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupScenario } from '../../test-utils.ts';

describe('cursor MCP install', () => {
  const { init, cleanup, givenSkillWithMcp, when, thenExists, thenMcpConfig } = setupScenario();

  beforeEach(() => init());
  afterEach(() => cleanup());

  it('installs MCP servers to .cursor/mcp.json with env-prefix syntax', async () => {
    await givenSkillWithMcp('my-skill', {
      github: {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-github'],
        env: { GITHUB_TOKEN: '${GITHUB_TOKEN}' },
      },
      linear: {
        command: 'npx',
        args: ['-y', 'mcp-remote', 'https://mcp.linear.app/mcp'],
      },
    });

    await when({ skills: ['my-skill'], agents: ['cursor'] });

    // Skill is installed
    expect(await thenExists('.cursor/skills/my-skill/SKILL.md')).toBe(true);

    // MCP config file exists and has correct content
    const config = await thenMcpConfig('.cursor/mcp.json');

    // github server: env vars translated to ${env:...} syntax
    expect(config.mcpServers.github).toEqual({
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github'],
      env: { GITHUB_TOKEN: '${env:GITHUB_TOKEN}' },
    });

    // linear server: no env vars, args unchanged
    expect(config.mcpServers.linear).toEqual({
      command: 'npx',
      args: ['-y', 'mcp-remote', 'https://mcp.linear.app/mcp'],
    });

    // No other servers
    expect(Object.keys(config.mcpServers)).toEqual(['github', 'linear']);
  });
});
