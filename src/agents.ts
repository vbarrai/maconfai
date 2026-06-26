import { homedir } from 'os'
import { join } from 'path'
import { existsSync } from 'fs'
import type { AgentConfig, AgentType } from './types.ts'

const home = homedir()
const codexHome = process.env.CODEX_HOME?.trim() || join(home, '.codex')
const claudeHome = process.env.CLAUDE_CONFIG_DIR?.trim() || join(home, '.claude')

export const agents: Record<AgentType, AgentConfig> = {
  'claude-code': {
    name: 'claude-code',
    displayName: 'Claude Code',
    skillsDir: '.claude/skills',
    globalSkillsDir: join(claudeHome, 'skills'),
    mcpConfigPath: '.mcp.json',
    mcpEnvSyntax: 'bare',
    hooksConfigPath: '.claude/settings.json',
    hooksConfigFormat: 'settings',
  },
  cursor: {
    name: 'cursor',
    displayName: 'Cursor',
    skillsDir: '.cursor/skills',
    globalSkillsDir: join(home, '.cursor/skills'),
    mcpConfigPath: '.cursor/mcp.json',
    mcpEnvSyntax: 'env-prefix',
    hooksConfigPath: '.cursor/hooks.json',
    hooksConfigFormat: 'dedicated',
  },
  codex: {
    name: 'codex',
    displayName: 'Codex',
    skillsDir: '.codex/skills',
    globalSkillsDir: join(home, '.agents/skills'),
    mcpConfigPath: '.codex/config.toml',
    mcpEnvSyntax: 'bare',
    mcpConfigFormat: 'codex',
    hooksConfigPath: '.codex/hooks.json',
    hooksConfigFormat: 'settings',
  },
  'open-code': {
    name: 'open-code',
    displayName: 'Open Code',
    skillsDir: '.opencode/skills',
    globalSkillsDir: join(home, '.config/opencode/skills'),
    mcpConfigPath: 'opencode.json',
    mcpEnvSyntax: 'opencode-env',
    mcpConfigFormat: 'opencode',
  },
}

export function detectInstalledAgents(): AgentType[] {
  const result: AgentType[] = []
  if (existsSync(claudeHome)) result.push('claude-code')
  if (existsSync(join(home, '.cursor'))) result.push('cursor')
  if (existsSync(codexHome) || existsSync('/etc/codex')) result.push('codex')
  if (existsSync(join(home, '.config/opencode'))) result.push('open-code')
  return result
}

export function detectProjectAgents(cwd = process.cwd()): AgentType[] {
  const result: AgentType[] = []
  if (
    existsSync(join(cwd, '.mcp.json')) ||
    existsSync(join(cwd, '.claude/settings.json')) ||
    existsSync(join(cwd, '.claude/skills'))
  )
    result.push('claude-code')
  if (
    existsSync(join(cwd, '.cursor/mcp.json')) ||
    existsSync(join(cwd, '.cursor/hooks.json')) ||
    existsSync(join(cwd, '.cursor/skills'))
  )
    result.push('cursor')
  if (existsSync(join(cwd, '.codex/config.toml')) || existsSync(join(cwd, '.codex/hooks.json')))
    result.push('codex')
  if (existsSync(join(cwd, 'opencode.json')) || existsSync(join(cwd, '.opencode/skills')))
    result.push('open-code')
  return result
}
