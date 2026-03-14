import { expect, describe, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir, readFile, readdir, access } from 'fs/promises';
import { join, relative } from 'path';
import { tmpdir } from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import type { AgentType, McpServerConfig } from '../src/types.ts';

const execFileAsync = promisify(execFile);
const CLI_PATH = join(import.meta.dirname, '..', 'src', 'cli.ts');

export type FileTree = Record<string, string>;

export function skillFile(name: string): string {
  const description = name.replace(/-/g, ' ');
  return `---\nname: ${name}\ndescription: ${description}\n---\n${description}`;
}

export async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export function setupScenario() {
  let tempDir: string;
  let sourceDir: string;
  let targetDir: string;

  async function init() {
    tempDir = await mkdtemp(join(tmpdir(), 'maconfai-e2e-'));
    sourceDir = join(tempDir, 'source');
    targetDir = join(tempDir, 'target');
    await mkdir(sourceDir, { recursive: true });
    await mkdir(targetDir, { recursive: true });
  }

  async function cleanup() {
    await rm(tempDir, { recursive: true, force: true });
  }

  async function given(files: FileTree) {
    for (const [path, content] of Object.entries(files)) {
      const fullPath = join(sourceDir, path);
      await mkdir(join(fullPath, '..'), { recursive: true });
      await writeFile(fullPath, content);
    }
  }

  interface SkillFixture {
    name: string;
    mcpServers?: Record<string, McpServerConfig>;
  }

  async function givenSource(opts: {
    skills?: SkillFixture[];
    mcps?: Record<string, McpServerConfig>;
  }) {
    const files: FileTree = {};

    for (const skill of (opts.skills ?? [])) {
      files[`./skills/${skill.name}/SKILL.md`] = skillFile(skill.name);
      if (skill.mcpServers) {
        files[`./skills/${skill.name}/mcp.json`] = JSON.stringify({ mcpServers: skill.mcpServers }, null, 2);
      }
    }

    if (opts.mcps) {
      files['./mcp.json'] = JSON.stringify({ mcpServers: opts.mcps }, null, 2);
    }

    await given(files);
  }

  async function sourceFiles(): Promise<string[]> {
    const files: string[] = [];
    async function walk(dir: string) {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile()) {
          files.push(relative(sourceDir, fullPath));
        }
      }
    }
    await walk(sourceDir);
    return files.sort();
  }

  async function givenSkill(...names: string[]) {
    await givenSource({ skills: names.map((name) => ({ name })) });
  }

  async function givenSkillWithMcp(
    name: string,
    mcpServers: Record<string, McpServerConfig>
  ) {
    await givenSource({ skills: [{ name, mcpServers }] });
  }

  async function when(opts: { skills?: string[]; agents?: AgentType[]; mcps?: string[]; extraArgs?: string[] }) {
    const args = ['--experimental-strip-types', CLI_PATH, 'install', sourceDir, '-y'];

    if (opts.skills?.length) {
      args.push(`--skills=${opts.skills.join(',')}`);
    }
    if (opts.agents?.length) {
      args.push(`--agents=${opts.agents.join(',')}`);
    }
    if (opts.mcps !== undefined) {
      args.push(`--mcps=${opts.mcps.join(',')}`);
    }
    if (opts.extraArgs?.length) {
      args.push(...opts.extraArgs);
    }

    return execFileAsync('node', args, { cwd: targetDir });
  }

  function getTargetDir() {
    return targetDir;
  }

  async function then(expected: FileTree) {
    for (const [path, expectedContent] of Object.entries(expected)) {
      const fullPath = join(targetDir, path);
      const content = await readFile(fullPath, 'utf-8');
      expect(content).toBe(expectedContent);
    }
  }

  async function thenExists(path: string): Promise<boolean> {
    return exists(join(targetDir, path));
  }

  async function thenFiles(): Promise<string[]> {
    const files: string[] = [];
    async function walk(dir: string) {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile() || entry.isSymbolicLink()) {
          files.push(relative(targetDir, fullPath));
        }
      }
    }
    await walk(targetDir);
    return files.sort();
  }

  async function thenFile(path: string): Promise<string> {
    return readFile(join(targetDir, path), 'utf-8');
  }

  async function thenMcpConfig(path: string): Promise<Record<string, any>> {
    const fullPath = join(targetDir, path);
    const content = await readFile(fullPath, 'utf-8');
    return JSON.parse(content);
  }

  return { init, cleanup, given, givenSource, givenSkill, givenSkillWithMcp, sourceFiles, when, then, thenExists, thenFile, thenFiles, thenMcpConfig, getTargetDir };
}

export type Scenario = ReturnType<typeof setupScenario>;

export function describeConfai(name: string, fn: (scenario: Scenario) => void) {
  describe(name, () => {
    const scenario = setupScenario();
    beforeEach(() => scenario.init());
    afterEach(() => scenario.cleanup());
    fn(scenario);
  });
}
