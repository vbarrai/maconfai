export type AgentType = 'claude-code' | 'cursor' | 'codex'

export type McpEnvSyntax = 'bare' | 'env-prefix'

export interface McpServerConfig {
  command?: string
  args?: string[]
  env?: Record<string, string>
  url?: string
  headers?: Record<string, string>
}

// Hook events are agent-specific JSON (different formats per agent)
export type HookEvents = Record<string, unknown[]>

export interface HookGroup {
  description?: string
  'claude-code'?: HookEvents
  cursor?: HookEvents
}

export interface Skill {
  name: string
  description: string
  path: string
  rawContent?: string
  mcpServers?: Record<string, McpServerConfig>
  hookGroups?: Record<string, HookGroup>
}

export interface AgentConfig {
  name: string
  displayName: string
  skillsDir: string
  globalSkillsDir: string
  mcpConfigPath?: string
  mcpEnvSyntax?: McpEnvSyntax
  hooksConfigPath?: string
  hooksConfigFormat?: 'settings' | 'dedicated'
}
