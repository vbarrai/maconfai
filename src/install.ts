import * as p from '@clack/prompts';
import pc from 'picocolors';
import { existsSync } from 'fs';
import { parseSource, getOwnerRepo } from './source-parser.ts';
import { cloneRepo, cleanupTempDir } from './git.ts';
import { discoverSkills, discoverMcpServers } from './skills.ts';
import {
  installSkill,
  uninstallSkill,
  listInstalledSkills,
} from './installer.ts';
import { agents, detectInstalledAgents } from './agents.ts';
import { readLock, removeFromLock } from './lock.ts';
import { installMcpServers, listInstalledMcpServerNames } from './mcp.ts';
import type { Skill, AgentType, McpServerConfig } from './types.ts';

const ALL_AGENTS: AgentType[] = ['claude-code', 'cursor', 'codex'];

const AGENT_ALIASES: Record<string, AgentType> = {
  'claude-code': 'claude-code',
  'claude': 'claude-code',
  'cursor': 'cursor',
  'codex': 'codex',
};

function parseListArg(args: string[], name: string): string[] | undefined {
  const prefix = `--${name}=`;
  const arg = args.find((a) => a.startsWith(prefix));
  if (!arg) return undefined;
  return arg.slice(prefix.length).split(',').map((s) => s.trim()).filter(Boolean);
}

function parseAgentsArg(args: string[]): AgentType[] | undefined {
  const raw = parseListArg(args, 'agents');
  if (!raw) return undefined;
  return raw.map((a) => {
    const resolved = AGENT_ALIASES[a.toLowerCase()];
    if (!resolved) throw new Error(`Unknown agent: ${a}. Valid: ${Object.keys(AGENT_ALIASES).join(', ')}`);
    return resolved;
  });
}

export async function runInstall(args: string[]): Promise<void> {
  if (args.length === 0) {
    // No source = interactive uninstall mode
    await runUninstall();
    return;
  }

  const source = args.find((a) => !a.startsWith('-'))!;
  const skipPrompts = args.includes('-y') || args.includes('--yes');
  const argAgents = parseAgentsArg(args);
  const argSkills = parseListArg(args, 'skills');
  const argMcps = parseListArg(args, 'mcps');
  const argBranch = parseListArg(args, 'branch')?.[0];

  console.log();
  p.intro(pc.bgCyan(pc.black(' maconfai install ')));

  const spinner = p.spinner();
  let tempDir: string | null = null;

  try {
    // Parse source
    spinner.start('Parsing source...');
    const parsed = parseSource(source);
    // --branch flag overrides any ref from the source
    if (argBranch) parsed.ref = argBranch;
    spinner.stop(`Source: ${parsed.type === 'local' ? parsed.localPath! : parsed.url}${parsed.ref ? ` (${parsed.ref})` : ''}`);

    // Resolve skills directory
    let skillsDir: string;

    if (parsed.type === 'local') {
      if (!existsSync(parsed.localPath!)) {
        p.log.error(pc.red(`Path not found: ${parsed.localPath}`));
        process.exit(1);
      }
      skillsDir = parsed.localPath!;
    } else {
      spinner.start('Cloning repository...');
      tempDir = await cloneRepo(parsed.url, parsed.ref);
      skillsDir = tempDir;
      spinner.stop('Repository cloned');
    }

    // Discover skills and MCP servers
    spinner.start('Discovering skills and MCP servers...');
    const skills = await discoverSkills(skillsDir);
    const rootMcpServers = await discoverMcpServers(skillsDir);
    const hasRootMcp = Object.keys(rootMcpServers).length > 0;

    if (skills.length === 0 && !hasRootMcp) {
      spinner.stop(pc.red('Nothing found'));
      p.log.error('No skills or MCP servers found.');
      await cleanup(tempDir);
      process.exit(1);
    }

    const parts: string[] = [];
    if (skills.length > 0) parts.push(`${skills.length} skill(s)`);
    if (hasRootMcp) parts.push(`${Object.keys(rootMcpServers).length} MCP server(s)`);
    spinner.stop(`Found ${pc.green(parts.join(' + '))}`);

    // Check which skills are already installed
    const installed = await listInstalledSkills({ global: false });
    const installedNames = new Set(installed.map((s) => s.name));

    // Select skills (installed ones are pre-checked)
    let selectedSkills: Skill[];
    let allSkills = skills;

    if (skills.length === 0) {
      selectedSkills = [];
    } else if (argSkills) {
      selectedSkills = skills.filter((s) => argSkills.includes(s.name));
    } else if (skills.length === 1 || skipPrompts) {
      selectedSkills = skills;
    } else {
      const choices = skills.map((s) => ({
        value: s,
        label: s.name,
        hint: s.description,
      }));

      const initialValues = skills.filter((s) => installedNames.has(s.name));

      const selected = await p.multiselect({
        message: `Select skills ${pc.dim('(space to toggle, uncheck to remove)')}`,
        options: choices as any,
        initialValues: initialValues as any,
        required: false,
      });

      if (p.isCancel(selected)) {
        p.cancel('Cancelled');
        await cleanup(tempDir);
        process.exit(0);
      }

      selectedSkills = selected as Skill[];
    }

    // Collect MCP servers from selected skills + root mcp.json
    interface McpEntry { serverName: string; source: string; config: McpServerConfig }
    const allMcpEntries: McpEntry[] = [];
    for (const skill of selectedSkills) {
      if (skill.mcpServers) {
        for (const [serverName, config] of Object.entries(skill.mcpServers)) {
          allMcpEntries.push({ serverName, source: skill.name, config });
        }
      }
    }
    for (const [serverName, config] of Object.entries(rootMcpServers)) {
      allMcpEntries.push({ serverName, source: 'mcp.json', config });
    }

    // Select MCP servers
    let selectedMcpNames: Set<string> = new Set();

    if (allMcpEntries.length > 0) {
      if (argMcps) {
        selectedMcpNames = new Set(argMcps);
      } else if (skipPrompts) {
        selectedMcpNames = new Set(allMcpEntries.map((e) => e.serverName));
      } else {
        const installedMcpNames = await listInstalledMcpServerNames();

        const mcpChoices = allMcpEntries.map((e) => ({
          value: e.serverName,
          label: `${e.serverName} ${pc.dim(`(from: ${e.source})`)}`,
        }));

        const initialMcpValues = allMcpEntries
          .filter((e) => installedMcpNames.has(e.serverName))
          .map((e) => e.serverName);

        const selectedMcp = await p.multiselect({
          message: `Select MCP servers to install ${pc.dim('(space to toggle)')}`,
          options: mcpChoices as any,
          initialValues: initialMcpValues,
          required: false,
        });

        if (p.isCancel(selectedMcp)) {
          p.cancel('Cancelled');
          await cleanup(tempDir);
          process.exit(0);
        }

        selectedMcpNames = new Set(selectedMcp as string[]);
      }
    }

    // Build per-skill MCP server maps (only selected servers)
    const mcpBySkill = new Map<string, Record<string, McpServerConfig>>();
    for (const entry of allMcpEntries) {
      if (selectedMcpNames.has(entry.serverName)) {
        if (!mcpBySkill.has(entry.source)) mcpBySkill.set(entry.source, {});
        mcpBySkill.get(entry.source)![entry.serverName] = entry.config;
      }
    }

    // Determine which agents previously had skills installed
    const previousAgents = new Set<AgentType>();
    for (const s of installed) {
      for (const a of s.agents) previousAgents.add(a);
    }

    // Select agents
    let targetAgents: AgentType[];
    let removedAgents: AgentType[] = [];

    if (argAgents) {
      targetAgents = argAgents;
    } else if (skipPrompts) {
      targetAgents = ALL_AGENTS;
    } else {
      const detected = detectInstalledAgents();
      // Only pre-check agents that have skills installed
      const preSelected = detected.filter((a) => previousAgents.has(a));

      if (detected.length === 0) {
        targetAgents = ALL_AGENTS;
        p.log.info('No agents detected, installing to all agents');
      } else if (detected.length === 1 && previousAgents.size === 0) {
        targetAgents = detected;
        p.log.info(`Installing to: ${pc.cyan(agents[detected[0]!].displayName)}`);
      } else {
        const agentChoices = ALL_AGENTS.map((a) => ({
          value: a,
          label: agents[a].displayName,
        }));

        const selected = await p.multiselect({
          message: `Select agents ${pc.dim('(space to toggle, uncheck to clean)')}`,
          options: agentChoices as any,
          initialValues: preSelected,
          required: false,
        });

        if (p.isCancel(selected)) {
          p.cancel('Cancelled');
          await cleanup(tempDir);
          process.exit(0);
        }

        targetAgents = selected as AgentType[];
        removedAgents = [...previousAgents].filter((a) => !targetAgents.includes(a));
      }
    }

    // Determine skills to install and uninstall
    const selectedNames = new Set(selectedSkills.map((s) => s.name));
    const toInstall = selectedSkills.filter((s) => !installedNames.has(s.name) || true);
    const toUninstall = allSkills.filter(
      (s) => installedNames.has(s.name) && !selectedNames.has(s.name)
    );

    // Build standalone MCP map (root-level, not tied to any skill)
    const standaloneMcps: Record<string, McpServerConfig> = {};
    for (const entry of allMcpEntries) {
      if (entry.source === 'mcp.json' && selectedMcpNames.has(entry.serverName)) {
        standaloneMcps[entry.serverName] = entry.config;
      }
    }
    const hasStandaloneMcps = Object.keys(standaloneMcps).length > 0;

    if (toInstall.length === 0 && toUninstall.length === 0 && removedAgents.length === 0 && !hasStandaloneMcps) {
      p.log.info('Nothing to do.');
      await cleanup(tempDir);
      p.outro('');
      return;
    }

    // Confirm
    if (!skipPrompts) {
      if (selectedSkills.length > 0) {
        p.log.info(`Install: ${selectedSkills.map((s) => pc.cyan(s.name)).join(', ')}`);
      }
      if (selectedMcpNames.size > 0) {
        p.log.info(`MCP servers: ${[...selectedMcpNames].map((n) => pc.cyan(n)).join(', ')}`);
      }
      if (toUninstall.length > 0) {
        p.log.info(`Remove skills: ${toUninstall.map((s) => pc.red(s.name)).join(', ')}`);
      }
      if (removedAgents.length > 0) {
        p.log.info(`Clean agents: ${removedAgents.map((a) => pc.red(agents[a].displayName)).join(', ')}`);
      }
      p.log.info(`Agents: ${targetAgents.map((a) => pc.cyan(agents[a].displayName)).join(', ')}`);

      const confirmed = await p.confirm({ message: 'Proceed?' });
      if (p.isCancel(confirmed) || !confirmed) {
        p.cancel('Cancelled');
        await cleanup(tempDir);
        process.exit(0);
      }
    }

    // Uninstall unchecked skills from ALL agents (selected + removed)
    if (toUninstall.length > 0) {
      spinner.start('Removing unchecked skills...');
      const lock = await readLock();
      for (const skill of toUninstall) {
        const lockEntry = lock.skills[skill.name];
        const mcpServerNames = lockEntry?.mcpServers;
        for (const agent of ALL_AGENTS) {
          await uninstallSkill(skill.name, agent, { global: false, mcpServerNames });
        }
      }
      spinner.stop(`Removed ${toUninstall.length} skill(s)`);
    }

    // Clean removed agents: remove ALL discovered skills from their directories
    if (removedAgents.length > 0) {
      spinner.start('Cleaning removed agents...');
      for (const skill of allSkills) {
        for (const agent of removedAgents) {
          await uninstallSkill(skill.name, agent, { global: false });
        }
      }
      spinner.stop(`Cleaned ${removedAgents.map((a) => agents[a].displayName).join(', ')}`);
    }

    // Install selected skills
    if (selectedSkills.length > 0) {
      spinner.start('Installing skills...');

      let successCount = 0;
      let failCount = 0;

      for (const skill of selectedSkills) {
        const skillMcpServers = mcpBySkill.get(skill.name);
        for (const agent of targetAgents) {
          const result = await installSkill(skill, agent, {
            global: false,
            mcpServers: skillMcpServers,
          });
          if (result.success) {
            successCount++;
          } else {
            failCount++;
            p.log.error(`Failed: ${skill.name} -> ${agents[agent].displayName}: ${result.error}`);
          }
        }
      }

      spinner.stop('Done');

      if (successCount > 0) {
        p.log.success(pc.green(`Installed ${successCount} skill(s)`));
      }
      if (failCount > 0) {
        p.log.error(pc.red(`Failed: ${failCount}`));
      }
    }

    // Install standalone MCP servers (from root mcp.json)
    if (hasStandaloneMcps) {
      spinner.start('Installing MCP servers...');
      for (const agent of targetAgents) {
        await installMcpServers(standaloneMcps, agent);
      }
      spinner.stop(`Installed ${Object.keys(standaloneMcps).length} MCP server(s)`);
    }
  } catch (error) {
    spinner.stop(pc.red('Error'));
    p.log.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    await cleanup(tempDir);
  }

  console.log();
  p.outro(pc.green('Done!'));
}

async function runUninstall(): Promise<void> {
  console.log();
  p.intro(pc.bgCyan(pc.black(' maconfai uninstall ')));

  const spinner = p.spinner();

  // Find installed skills (both scopes)
  spinner.start('Scanning installed skills...');
  const projectSkills = await listInstalledSkills({ global: false });
  const globalSkills = await listInstalledSkills({ global: true });
  const allSkills = [
    ...projectSkills.map((s) => ({ ...s, scope: 'project' as const })),
    ...globalSkills.map((s) => ({ ...s, scope: 'global' as const })),
  ];
  spinner.stop(`Found ${allSkills.length} installed skill(s)`);

  if (allSkills.length === 0) {
    p.log.info('No skills installed.');
    p.outro('');
    return;
  }

  // Select skills to remove
  const choices = allSkills.map((s) => ({
    value: s,
    label: `${s.name} ${pc.dim(`[${s.scope}]`)} ${pc.dim(`(${s.agents.map((a) => agents[a].displayName).join(', ')})`)}`,
  }));

  const selected = await p.multiselect({
    message: `Select skills to uninstall ${pc.dim('(space to toggle)')}`,
    options: choices as any,
    required: true,
  });

  if (p.isCancel(selected)) {
    p.cancel('Cancelled');
    process.exit(0);
  }

  const toRemove = selected as typeof allSkills;

  const confirmed = await p.confirm({
    message: `Remove ${toRemove.length} skill(s)?`,
  });

  if (p.isCancel(confirmed) || !confirmed) {
    p.cancel('Cancelled');
    process.exit(0);
  }

  spinner.start('Removing skills...');

  const lock = await readLock();
  for (const skill of toRemove) {
    const lockEntry = lock.skills[skill.name];
    const mcpServerNames = lockEntry?.mcpServers;
    for (const agent of skill.agents) {
      await uninstallSkill(skill.dirName, agent, { global: skill.scope === 'global', mcpServerNames });
    }

    if (skill.scope === 'global') {
      await removeFromLock(skill.name).catch(() => {});
    }
  }

  spinner.stop(`Removed ${toRemove.length} skill(s)`);

  console.log();
  p.outro(pc.green('Done!'));
}

async function cleanup(tempDir: string | null): Promise<void> {
  if (tempDir) {
    await cleanupTempDir(tempDir).catch(() => {});
  }
}
