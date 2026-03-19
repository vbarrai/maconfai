import { readFile, writeFile, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import type { AgentType, McpServerConfig, McpEnvSyntax } from './types.ts'
import { agents } from './agents.ts'

interface McpConfigFile {
  mcpServers?: Record<string, McpServerConfig>
  [key: string]: unknown
}

interface OpenCodeMcpServer {
  type?: 'local' | 'remote'
  command?: string[]
  url?: string
  headers?: Record<string, string>
  environment?: Record<string, string>
  enabled?: boolean
}

interface OpenCodeConfigFile {
  mcp?: Record<string, OpenCodeMcpServer>
  [key: string]: unknown
}

function toOpenCodeServer(server: McpServerConfig): OpenCodeMcpServer {
  if (server.url) {
    const result: OpenCodeMcpServer = { type: 'remote', url: server.url }
    if (server.headers) result.headers = server.headers
    return result
  }
  const result: OpenCodeMcpServer = { type: 'local' }
  const cmd: string[] = []
  if (server.command) cmd.push(server.command)
  if (server.args) cmd.push(...server.args)
  if (cmd.length > 0) result.command = cmd
  if (server.env) result.environment = server.env
  return result
}


export function translateEnvVar(value: string, syntax: McpEnvSyntax): string {
  if (syntax === 'bare') return value
  // Convert ${VAR} and ${VAR:-default} to ${env:VAR} and ${env:VAR:-default}
  // but skip already-prefixed ${env:...}
  return value.replace(/\$\{(?!env:)([^}]+)\}/g, '${env:$1}')
}

function translateStringFields(
  obj: Record<string, unknown>,
  syntax: McpEnvSyntax,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = translateEnvVar(value, syntax)
    } else if (Array.isArray(value)) {
      result[key] = value.map((v) => (typeof v === 'string' ? translateEnvVar(v, syntax) : v))
    } else if (value && typeof value === 'object') {
      result[key] = translateStringFields(value as Record<string, unknown>, syntax)
    } else {
      result[key] = value
    }
  }
  return result
}

export function translateServerConfig(
  server: McpServerConfig,
  syntax: McpEnvSyntax,
): McpServerConfig {
  if (syntax === 'bare') return server
  return translateStringFields(
    server as unknown as Record<string, unknown>,
    syntax,
  ) as unknown as McpServerConfig
}

async function readMcpConfig(filePath: string): Promise<McpConfigFile> {
  try {
    const content = await readFile(filePath, 'utf-8')
    return JSON.parse(content) as McpConfigFile
  } catch {
    return {}
  }
}

async function writeMcpConfig(filePath: string, config: McpConfigFile): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, JSON.stringify(config, null, 2) + '\n', 'utf-8')
}

export async function installMcpServers(
  servers: Record<string, McpServerConfig>,
  agentType: AgentType,
  options: { cwd?: string } = {},
): Promise<{ installed: string[]; skipped: string[] }> {
  const agent = agents[agentType]
  if (!agent.mcpConfigPath || !agent.mcpEnvSyntax) {
    return { installed: [], skipped: Object.keys(servers) }
  }

  const cwd = options.cwd || process.cwd()
  const configPath = join(cwd, agent.mcpConfigPath)

  if (agent.mcpConfigFormat === 'opencode') {
    return installMcpServersOpenCode(servers, configPath, agent.mcpEnvSyntax)
  }

  const config = await readMcpConfig(configPath)

  if (!config.mcpServers) {
    config.mcpServers = {}
  }

  const installed: string[] = []
  const skipped: string[] = []

  for (const [name, serverConfig] of Object.entries(servers)) {
    if (config.mcpServers[name]) {
      skipped.push(name)
      continue
    }
    config.mcpServers[name] = translateServerConfig(serverConfig, agent.mcpEnvSyntax)
    installed.push(name)
  }

  if (installed.length > 0) {
    await writeMcpConfig(configPath, config)
  }

  return { installed, skipped }
}

async function installMcpServersOpenCode(
  servers: Record<string, McpServerConfig>,
  configPath: string,
  syntax: McpEnvSyntax,
): Promise<{ installed: string[]; skipped: string[] }> {
  let config: OpenCodeConfigFile = {}
  try {
    const content = await readFile(configPath, 'utf-8')
    config = JSON.parse(content) as OpenCodeConfigFile
  } catch {}

  if (!config.mcp) {
    config.mcp = {}
  }

  const installed: string[] = []
  const skipped: string[] = []

  for (const [name, serverConfig] of Object.entries(servers)) {
    if (config.mcp[name]) {
      skipped.push(name)
      continue
    }
    const translated = translateServerConfig(serverConfig, syntax)
    config.mcp[name] = toOpenCodeServer(translated)
    installed.push(name)
  }

  if (installed.length > 0) {
    await mkdir(dirname(configPath), { recursive: true })
    await writeFile(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8')
  }

  return { installed, skipped }
}

export async function listInstalledMcpServerNames(
  options: { cwd?: string } = {},
): Promise<Set<string>> {
  const cwd = options.cwd || process.cwd()
  const names = new Set<string>()

  for (const agent of Object.values(agents)) {
    if (!agent.mcpConfigPath) continue
    const filePath = join(cwd, agent.mcpConfigPath)

    if (agent.mcpConfigFormat === 'opencode') {
      try {
        const content = await readFile(filePath, 'utf-8')
        const config = JSON.parse(content) as OpenCodeConfigFile
        if (config.mcp) {
          for (const name of Object.keys(config.mcp)) {
            names.add(name)
          }
        }
      } catch {}
    } else {
      const config = await readMcpConfig(filePath)
      if (config.mcpServers) {
        for (const name of Object.keys(config.mcpServers)) {
          names.add(name)
        }
      }
    }
  }

  return names
}

export async function uninstallMcpServers(
  serverNames: string[],
  agentType: AgentType,
  options: { cwd?: string } = {},
): Promise<void> {
  const agent = agents[agentType]
  if (!agent.mcpConfigPath) return

  const cwd = options.cwd || process.cwd()
  const configPath = join(cwd, agent.mcpConfigPath)

  if (agent.mcpConfigFormat === 'opencode') {
    let config: OpenCodeConfigFile = {}
    try {
      const content = await readFile(configPath, 'utf-8')
      config = JSON.parse(content) as OpenCodeConfigFile
    } catch {
      return
    }
    if (!config.mcp) return
    for (const name of serverNames) {
      delete config.mcp[name]
    }
    await mkdir(dirname(configPath), { recursive: true })
    await writeFile(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8')
    return
  }

  const config = await readMcpConfig(configPath)

  if (!config.mcpServers) return

  for (const name of serverNames) {
    delete config.mcpServers[name]
  }

  await writeMcpConfig(configPath, config)
}
