export type AgentType = 'claude-code' | 'cursor' | 'codex';

export type McpEnvSyntax = 'bare' | 'env-prefix';

export interface McpServerConfig {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
}

export interface Skill {
  name: string;
  description: string;
  path: string;
  rawContent?: string;
  mcpServers?: Record<string, McpServerConfig>;
}

export interface AgentConfig {
  name: string;
  displayName: string;
  skillsDir: string;
  globalSkillsDir: string;
  mcpConfigPath?: string;
  mcpEnvSyntax?: McpEnvSyntax;
}
