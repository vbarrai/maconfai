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

// ── Codex TOML helpers ─────────────────────────────────────

function tomlEscape(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function tomlValue(value: unknown): string {
  if (typeof value === 'string') return `"${tomlEscape(value)}"`
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return `[${value.map(tomlValue).join(', ')}]`
  return String(value)
}

function tomlInlineTable(obj: Record<string, string>): string {
  const entries = Object.entries(obj).map(([k, v]) => `${k} = ${tomlValue(v)}`)
  return `{ ${entries.join(', ')} }`
}

function toCodexServer(name: string, server: McpServerConfig): string {
  const lines: string[] = [`[mcp_servers.${name}]`]

  if (server.url) {
    lines.push(`url = ${tomlValue(server.url)}`)
    if (server.headers) {
      const staticHeaders: Record<string, string> = {}
      const envHeaders: Record<string, string> = {}
      for (const [key, val] of Object.entries(server.headers)) {
        const envMatch = val.match(/^Bearer \$\{(.+)\}$/)
        if (envMatch) {
          envHeaders[key] = envMatch[1]
        } else if (/\$\{.+\}/.test(val)) {
          envHeaders[key] = val.replace(/^\$\{|\}$/g, '')
        } else {
          staticHeaders[key] = val
        }
      }
      if (Object.keys(staticHeaders).length > 0) {
        lines.push(`http_headers = ${tomlInlineTable(staticHeaders)}`)
      }
      if (Object.keys(envHeaders).length > 0) {
        lines.push(`env_http_headers = ${tomlInlineTable(envHeaders)}`)
      }
    }
  } else {
    if (server.command) lines.push(`command = ${tomlValue(server.command)}`)
    if (server.args?.length) lines.push(`args = ${tomlValue(server.args)}`)
    if (server.env && Object.keys(server.env).length > 0) {
      lines.push(`env = ${tomlInlineTable(server.env)}`)
    }
  }

  return lines.join('\n')
}

function parseCodexToml(content: string): Record<string, string[]> {
  const servers: Record<string, string[]> = {}
  let current: string | null = null

  for (const line of content.split('\n')) {
    const match = line.match(/^\[mcp_servers\.(.+)\]$/)
    if (match) {
      current = match[1]
      servers[current] = [line]
    } else if (current !== null) {
      if (line.startsWith('[') && !line.startsWith('[mcp_servers.')) {
        current = null
      } else {
        servers[current].push(line)
      }
    }
  }

  // Trim trailing empty lines from each section
  for (const lines of Object.values(servers)) {
    while (lines.length > 1 && lines[lines.length - 1].trim() === '') {
      lines.pop()
    }
  }

  return servers
}

async function readCodexToml(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, 'utf-8')
  } catch {
    return ''
  }
}

async function installMcpServersCodex(
  servers: Record<string, McpServerConfig>,
  configPath: string,
  syntax: McpEnvSyntax,
  ownedNames?: Set<string>,
): Promise<{ installed: string[]; skipped: string[] }> {
  const content = await readCodexToml(configPath)
  const existing = parseCodexToml(content)

  const installed: string[] = []
  const skipped: string[] = []

  for (const [name, serverConfig] of Object.entries(servers)) {
    if (existing[name] && !ownedNames?.has(name)) {
      skipped.push(name)
      continue
    }
    const translated = translateServerConfig(serverConfig, syntax)
    existing[name] = toCodexServer(name, translated).split('\n')
    installed.push(name)
  }

  if (installed.length > 0) {
    const nonMcpLines: string[] = []
    for (const line of content.split('\n')) {
      if (line.match(/^\[mcp_servers\./)) break
      nonMcpLines.push(line)
    }

    // Remove trailing empty lines from non-MCP section
    while (nonMcpLines.length > 0 && nonMcpLines[nonMcpLines.length - 1].trim() === '') {
      nonMcpLines.pop()
    }

    const sections = Object.values(existing).map((lines) => lines.join('\n'))
    const parts = nonMcpLines.length > 0 ? [nonMcpLines.join('\n'), ...sections] : sections
    const output = parts.join('\n\n') + '\n'

    await mkdir(dirname(configPath), { recursive: true })
    await writeFile(configPath, output, 'utf-8')
  }

  return { installed, skipped }
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
  if (syntax === 'opencode-env') {
    // Open Code uses {env:VAR} (no leading $). Convert ${VAR} → {env:VAR}, skip pre-converted {env:...}.
    return value.replace(/\$\{([^}]+)\}/g, '{env:$1}')
  }
  // env-prefix (Cursor): convert ${VAR} and ${VAR:-default} to ${env:VAR}, skip already-prefixed.
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
  options: { cwd?: string; ownedNames?: Set<string> } = {},
): Promise<{ installed: string[]; skipped: string[] }> {
  const agent = agents[agentType]
  if (!agent.mcpConfigPath || !agent.mcpEnvSyntax) {
    return { installed: [], skipped: Object.keys(servers) }
  }

  const cwd = options.cwd || process.cwd()
  const configPath = join(cwd, agent.mcpConfigPath)

  if (agent.mcpConfigFormat === 'opencode') {
    return installMcpServersOpenCode(servers, configPath, agent.mcpEnvSyntax, options.ownedNames)
  }

  if (agent.mcpConfigFormat === 'codex') {
    return installMcpServersCodex(servers, configPath, agent.mcpEnvSyntax, options.ownedNames)
  }

  const config = await readMcpConfig(configPath)

  if (!config.mcpServers) {
    config.mcpServers = {}
  }

  const installed: string[] = []
  const skipped: string[] = []

  for (const [name, serverConfig] of Object.entries(servers)) {
    if (config.mcpServers[name] && !options.ownedNames?.has(name)) {
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
  ownedNames?: Set<string>,
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
    if (config.mcp[name] && !ownedNames?.has(name)) {
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
    } else if (agent.mcpConfigFormat === 'codex') {
      try {
        const content = await readFile(filePath, 'utf-8')
        const servers = parseCodexToml(content)
        for (const name of Object.keys(servers)) {
          names.add(name)
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

  if (agent.mcpConfigFormat === 'codex') {
    const content = await readCodexToml(configPath)
    if (!content) return
    const existing = parseCodexToml(content)
    for (const name of serverNames) {
      delete existing[name]
    }
    const nonMcpLines: string[] = []
    for (const line of content.split('\n')) {
      if (line.match(/^\[mcp_servers\./)) break
      nonMcpLines.push(line)
    }
    while (nonMcpLines.length > 0 && nonMcpLines[nonMcpLines.length - 1].trim() === '') {
      nonMcpLines.pop()
    }
    const sections = Object.values(existing).map((lines) => lines.join('\n'))
    const parts = nonMcpLines.length > 0 ? [nonMcpLines.join('\n'), ...sections] : sections
    const output = parts.length > 0 ? parts.join('\n\n') + '\n' : ''
    await mkdir(dirname(configPath), { recursive: true })
    await writeFile(configPath, output, 'utf-8')
    return
  }

  const config = await readMcpConfig(configPath)

  if (!config.mcpServers) return

  for (const name of serverNames) {
    delete config.mcpServers[name]
  }

  await writeMcpConfig(configPath, config)
}
