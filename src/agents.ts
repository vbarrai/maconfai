import { homedir } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';
import type { AgentConfig, AgentType } from './types.ts';

const home = homedir();
const codexHome = process.env.CODEX_HOME?.trim() || join(home, '.codex');
const claudeHome = process.env.CLAUDE_CONFIG_DIR?.trim() || join(home, '.claude');

export const agents: Record<AgentType, AgentConfig> = {
  'claude-code': {
    name: 'claude-code',
    displayName: 'Claude Code',
    skillsDir: '.claude/skills',
    globalSkillsDir: join(claudeHome, 'skills'),
    mcpConfigPath: '.mcp.json',
    mcpEnvSyntax: 'bare',
  },
  cursor: {
    name: 'cursor',
    displayName: 'Cursor',
    skillsDir: '.cursor/skills',
    globalSkillsDir: join(home, '.cursor/skills'),
    mcpConfigPath: '.cursor/mcp.json',
    mcpEnvSyntax: 'env-prefix',
  },
  codex: {
    name: 'codex',
    displayName: 'Codex',
    skillsDir: '.codex/skills',
    globalSkillsDir: join(codexHome, 'skills'),
  },
};

export function detectInstalledAgents(): AgentType[] {
  const result: AgentType[] = [];
  if (existsSync(claudeHome)) result.push('claude-code');
  if (existsSync(join(home, '.cursor'))) result.push('cursor');
  if (existsSync(codexHome) || existsSync('/etc/codex')) result.push('codex');
  return result;
}
