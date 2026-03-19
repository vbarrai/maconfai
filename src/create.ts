import * as p from '@clack/prompts'
import pc from 'picocolors'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

type ConfigType = 'skill' | 'mcp' | 'hook'

interface SkillConfig {
  name: string
  description: string
  content: string
}

interface McpConfig {
  name: string
  transport: 'stdio' | 'url'
  command?: string
  args?: string[]
  url?: string
  headers?: Record<string, string>
  env?: Record<string, string>
}

interface HookConfig {
  name: string
  description: string
  agents: ('claude-code' | 'cursor')[]
  events: Record<string, Record<string, unknown[]>>
}

export async function runCreate(): Promise<void> {
  console.log()
  p.intro(pc.bgCyan(pc.black(' maconfai create ')))

  const configType = await p.select({
    message: 'What do you want to create?',
    options: [
      { value: 'skill', label: 'Skill', hint: 'A SKILL.md file in skills/' },
      { value: 'mcp', label: 'MCP server', hint: 'An MCP server config in mcp.json or mcps/' },
      { value: 'hook', label: 'Hook', hint: 'A hook config in hooks.json or hooks/' },
    ],
  })

  if (p.isCancel(configType)) {
    p.cancel('Cancelled')
    return
  }

  switch (configType as ConfigType) {
    case 'skill':
      await createSkill()
      break
    case 'mcp':
      await createMcp()
      break
    case 'hook':
      await createHook()
      break
  }

  console.log()
  p.outro(pc.green('Done!'))
}

async function createSkill(): Promise<void> {
  const name = await p.text({
    message: 'Skill name',
    placeholder: 'my-skill',
    validate: (v) => {
      if (!v.trim()) return 'Name is required'
      if (!/^[a-z0-9][a-z0-9-]*$/.test(v.trim()))
        return 'Use lowercase letters, numbers, and hyphens'
    },
  })
  if (p.isCancel(name)) {
    p.cancel('Cancelled')
    return
  }

  const description = await p.text({
    message: 'Description',
    placeholder: 'What this skill does',
    validate: (v) => {
      if (!v.trim()) return 'Description is required'
    },
  })
  if (p.isCancel(description)) {
    p.cancel('Cancelled')
    return
  }

  const content = await p.text({
    message: 'Skill instructions (markdown body)',
    placeholder: 'Instructions for the AI agent...',
    defaultValue: '',
  })
  if (p.isCancel(content)) {
    p.cancel('Cancelled')
    return
  }

  const skill: SkillConfig = {
    name: name.trim(),
    description: description.trim(),
    content: content.trim(),
  }

  const skillDir = join('skills', skill.name)
  const skillMdPath = join(skillDir, 'SKILL.md')

  if (existsSync(skillMdPath)) {
    const overwrite = await p.confirm({ message: `${skillMdPath} already exists. Overwrite?` })
    if (p.isCancel(overwrite) || !overwrite) {
      p.cancel('Cancelled')
      return
    }
  }

  await mkdir(skillDir, { recursive: true })

  const frontmatter = `---\nname: ${skill.name}\ndescription: ${skill.description}\n---`
  const body = skill.content ? `\n${skill.content}\n` : '\n'
  await writeFile(skillMdPath, frontmatter + body, 'utf-8')

  p.log.success(`Created ${pc.cyan(skillMdPath)}`)
}

async function createMcp(): Promise<void> {
  const name = await p.text({
    message: 'MCP server name',
    placeholder: 'my-mcp-server',
    validate: (v) => {
      if (!v.trim()) return 'Name is required'
      if (!/^[a-z0-9][a-z0-9-]*$/.test(v.trim()))
        return 'Use lowercase letters, numbers, and hyphens'
    },
  })
  if (p.isCancel(name)) {
    p.cancel('Cancelled')
    return
  }

  const transport = await p.select({
    message: 'Transport type',
    options: [
      { value: 'stdio', label: 'stdio', hint: 'Command-based (npx, node, etc.)' },
      { value: 'url', label: 'URL', hint: 'HTTP/SSE endpoint' },
    ],
  })
  if (p.isCancel(transport)) {
    p.cancel('Cancelled')
    return
  }

  const mcp: McpConfig = { name: name.trim(), transport: transport as 'stdio' | 'url' }

  if (transport === 'stdio') {
    const command = await p.text({
      message: 'Command',
      placeholder: 'npx',
      validate: (v) => {
        if (!v.trim()) return 'Command is required'
      },
    })
    if (p.isCancel(command)) {
      p.cancel('Cancelled')
      return
    }
    mcp.command = command.trim()

    const argsRaw = await p.text({
      message: 'Arguments (space-separated)',
      placeholder: '-y mcp-remote https://example.com',
      defaultValue: '',
    })
    if (p.isCancel(argsRaw)) {
      p.cancel('Cancelled')
      return
    }
    if (argsRaw.trim()) {
      mcp.args = argsRaw.trim().split(/\s+/)
    }
  } else {
    const url = await p.text({
      message: 'Server URL',
      placeholder: 'https://mcp.example.com/sse',
      validate: (v) => {
        if (!v.trim()) return 'URL is required'
      },
    })
    if (p.isCancel(url)) {
      p.cancel('Cancelled')
      return
    }
    mcp.url = url.trim()

    const hasHeaders = await p.confirm({
      message: 'Add custom headers?',
      initialValue: false,
    })
    if (p.isCancel(hasHeaders)) {
      p.cancel('Cancelled')
      return
    }

    if (hasHeaders) {
      const headers: Record<string, string> = {}
      let addMore = true
      while (addMore) {
        const headerName = await p.text({
          message: 'Header name',
          placeholder: 'Authorization',
          validate: (v) => {
            if (!v.trim()) return 'Header name is required'
          },
        })
        if (p.isCancel(headerName)) {
          p.cancel('Cancelled')
          return
        }
        const headerValue = await p.text({
          message: `Value for ${headerName}`,
          placeholder: 'Bearer ${API_TOKEN}',
          validate: (v) => {
            if (!v.trim()) return 'Header value is required'
          },
        })
        if (p.isCancel(headerValue)) {
          p.cancel('Cancelled')
          return
        }
        headers[headerName.trim()] = headerValue.trim()

        const more = await p.confirm({ message: 'Add another header?', initialValue: false })
        if (p.isCancel(more)) {
          p.cancel('Cancelled')
          return
        }
        addMore = more
      }
      mcp.headers = headers
    }
  }

  const hasEnv = await p.confirm({
    message: 'Add environment variables?',
    initialValue: false,
  })
  if (p.isCancel(hasEnv)) {
    p.cancel('Cancelled')
    return
  }

  if (hasEnv) {
    const env: Record<string, string> = {}
    let addMore = true
    while (addMore) {
      const envName = await p.text({
        message: 'Variable name',
        placeholder: 'API_KEY',
        validate: (v) => {
          if (!v.trim()) return 'Variable name is required'
        },
      })
      if (p.isCancel(envName)) {
        p.cancel('Cancelled')
        return
      }
      const envValue = await p.text({
        message: `Value for ${envName}`,
        placeholder: '${API_KEY}',
        validate: (v) => {
          if (!v.trim()) return 'Value is required'
        },
      })
      if (p.isCancel(envValue)) {
        p.cancel('Cancelled')
        return
      }
      env[envName.trim()] = envValue.trim()

      const more = await p.confirm({ message: 'Add another variable?', initialValue: false })
      if (p.isCancel(more)) {
        p.cancel('Cancelled')
        return
      }
      addMore = more
    }
    mcp.env = env
  }

  const location = await p.select({
    message: 'Where to save?',
    options: [
      { value: 'root', label: 'Root mcp.json', hint: 'Merge into ./mcp.json' },
      { value: 'dir', label: `Dedicated directory`, hint: `mcps/${mcp.name}/mcp.json` },
    ],
  })
  if (p.isCancel(location)) {
    p.cancel('Cancelled')
    return
  }

  const serverConfig: Record<string, unknown> = {}
  if (mcp.command) serverConfig.command = mcp.command
  if (mcp.args?.length) serverConfig.args = mcp.args
  if (mcp.url) serverConfig.url = mcp.url
  if (mcp.headers && Object.keys(mcp.headers).length > 0) serverConfig.headers = mcp.headers
  if (mcp.env && Object.keys(mcp.env).length > 0) serverConfig.env = mcp.env

  if (location === 'root') {
    const mcpJsonPath = 'mcp.json'
    let existing: { mcpServers?: Record<string, unknown> } = {}
    if (existsSync(mcpJsonPath)) {
      const { readFile: rf } = await import('fs/promises')
      try {
        existing = JSON.parse(await rf(mcpJsonPath, 'utf-8'))
      } catch {}
    }
    if (!existing.mcpServers) existing.mcpServers = {}

    if (existing.mcpServers[mcp.name]) {
      const overwrite = await p.confirm({ message: `MCP "${mcp.name}" already exists. Overwrite?` })
      if (p.isCancel(overwrite) || !overwrite) {
        p.cancel('Cancelled')
        return
      }
    }

    existing.mcpServers[mcp.name] = serverConfig
    await writeFile(mcpJsonPath, JSON.stringify(existing, null, 2) + '\n', 'utf-8')
    p.log.success(`Created MCP server ${pc.cyan(mcp.name)} in ${pc.cyan(mcpJsonPath)}`)
  } else {
    const mcpDir = join('mcps', mcp.name)
    const mcpJsonPath = join(mcpDir, 'mcp.json')

    if (existsSync(mcpJsonPath)) {
      const overwrite = await p.confirm({ message: `${mcpJsonPath} already exists. Overwrite?` })
      if (p.isCancel(overwrite) || !overwrite) {
        p.cancel('Cancelled')
        return
      }
    }

    await mkdir(mcpDir, { recursive: true })
    const content = { mcpServers: { [mcp.name]: serverConfig } }
    await writeFile(mcpJsonPath, JSON.stringify(content, null, 2) + '\n', 'utf-8')
    p.log.success(`Created ${pc.cyan(mcpJsonPath)}`)
  }
}

async function createHook(): Promise<void> {
  const name = await p.text({
    message: 'Hook group name',
    placeholder: 'my-hook',
    validate: (v) => {
      if (!v.trim()) return 'Name is required'
      if (!/^[a-z0-9][a-z0-9-]*$/.test(v.trim()))
        return 'Use lowercase letters, numbers, and hyphens'
    },
  })
  if (p.isCancel(name)) {
    p.cancel('Cancelled')
    return
  }

  const description = await p.text({
    message: 'Description',
    placeholder: 'What this hook does',
    defaultValue: '',
  })
  if (p.isCancel(description)) {
    p.cancel('Cancelled')
    return
  }

  const agentChoices = await p.multiselect({
    message: 'Which agents?',
    options: [
      { value: 'claude-code', label: 'Claude Code' },
      { value: 'cursor', label: 'Cursor' },
    ],
    required: true,
  })
  if (p.isCancel(agentChoices)) {
    p.cancel('Cancelled')
    return
  }

  const selectedAgents = agentChoices as ('claude-code' | 'cursor')[]

  const CLAUDE_CODE_EVENTS = ['PreToolUse', 'PostToolUse', 'Notification', 'Stop']
  const CURSOR_EVENTS = ['onFileChange', 'onSave', 'afterResponse']

  const hook: HookConfig = {
    name: name.trim(),
    description: description.trim(),
    agents: selectedAgents,
    events: {},
  }

  for (const agent of selectedAgents) {
    const events = agent === 'claude-code' ? CLAUDE_CODE_EVENTS : CURSOR_EVENTS
    hook.events[agent] = {}

    const selectedEvents = await p.multiselect({
      message: `Select events for ${pc.cyan(agent === 'claude-code' ? 'Claude Code' : 'Cursor')}`,
      options: events.map((e) => ({ value: e, label: e })),
      required: true,
    })
    if (p.isCancel(selectedEvents)) {
      p.cancel('Cancelled')
      return
    }

    for (const event of selectedEvents as string[]) {
      const command = await p.text({
        message: `Command for ${pc.cyan(event)} (${agent})`,
        placeholder: agent === 'claude-code' ? 'echo "hook fired"' : 'npm run lint',
        validate: (v) => {
          if (!v.trim()) return 'Command is required'
        },
      })
      if (p.isCancel(command)) {
        p.cancel('Cancelled')
        return
      }

      if (agent === 'claude-code') {
        const matcher = await p.text({
          message: `Tool matcher for ${pc.cyan(event)} (regex pattern, leave empty for all)`,
          placeholder: 'Write|Edit',
          defaultValue: '',
        })
        if (p.isCancel(matcher)) {
          p.cancel('Cancelled')
          return
        }

        const handler: Record<string, unknown> = { command: command.trim() }
        if (matcher.trim()) handler.matcher = matcher.trim()

        hook.events[agent][event] = [handler]
      } else {
        hook.events[agent][event] = [{ command: command.trim() }]
      }
    }
  }

  const location = await p.select({
    message: 'Where to save?',
    options: [
      { value: 'root', label: 'Root hooks.json', hint: 'Merge into ./hooks.json' },
      { value: 'dir', label: 'Dedicated directory', hint: `hooks/${hook.name}/hooks.json` },
    ],
  })
  if (p.isCancel(location)) {
    p.cancel('Cancelled')
    return
  }

  const hookGroup: Record<string, unknown> = {}
  if (hook.description) hookGroup.description = hook.description
  for (const agent of hook.agents) {
    hookGroup[agent] = hook.events[agent]
  }

  if (location === 'root') {
    const hooksJsonPath = 'hooks.json'
    let existing: { hooks?: Record<string, unknown> } = {}
    if (existsSync(hooksJsonPath)) {
      const { readFile: rf } = await import('fs/promises')
      try {
        existing = JSON.parse(await rf(hooksJsonPath, 'utf-8'))
      } catch {}
    }
    if (!existing.hooks) existing.hooks = {}

    if (existing.hooks[hook.name]) {
      const overwrite = await p.confirm({
        message: `Hook "${hook.name}" already exists. Overwrite?`,
      })
      if (p.isCancel(overwrite) || !overwrite) {
        p.cancel('Cancelled')
        return
      }
    }

    existing.hooks[hook.name] = hookGroup
    await writeFile(hooksJsonPath, JSON.stringify(existing, null, 2) + '\n', 'utf-8')
    p.log.success(`Created hook ${pc.cyan(hook.name)} in ${pc.cyan(hooksJsonPath)}`)
  } else {
    const hookDir = join('hooks', hook.name)
    const hooksJsonPath = join(hookDir, 'hooks.json')

    if (existsSync(hooksJsonPath)) {
      const overwrite = await p.confirm({ message: `${hooksJsonPath} already exists. Overwrite?` })
      if (p.isCancel(overwrite) || !overwrite) {
        p.cancel('Cancelled')
        return
      }
    }

    await mkdir(hookDir, { recursive: true })
    const content = { hooks: { [hook.name]: hookGroup } }
    await writeFile(hooksJsonPath, JSON.stringify(content, null, 2) + '\n', 'utf-8')
    p.log.success(`Created ${pc.cyan(hooksJsonPath)}`)
  }
}
