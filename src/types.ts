export type AgentType = 'claude-code' | 'cursor' | 'codex';

export interface Skill {
  name: string;
  description: string;
  path: string;
  rawContent?: string;
}

export interface AgentConfig {
  name: string;
  displayName: string;
  skillsDir: string;
  globalSkillsDir: string;
}
