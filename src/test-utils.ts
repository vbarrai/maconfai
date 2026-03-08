import { expect } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import type { AgentType } from './types.ts';

const execFileAsync = promisify(execFile);
const CLI_PATH = join(import.meta.dirname, 'cli.ts');

export type FileTree = Record<string, string>;

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

  async function when(opts: { skills?: string[]; agents?: AgentType[] }) {
    const args = ['--experimental-strip-types', CLI_PATH, 'install', sourceDir, '-y'];

    if (opts.skills?.length) {
      args.push(`--skills=${opts.skills.join(',')}`);
    }
    if (opts.agents?.length) {
      args.push(`--agents=${opts.agents.join(',')}`);
    }

    await execFileAsync('node', args, { cwd: targetDir });
  }

  async function then(expected: FileTree) {
    for (const [path, expectedContent] of Object.entries(expected)) {
      const fullPath = join(targetDir, path);
      const content = await readFile(fullPath, 'utf-8');
      expect(content).toBe(expectedContent);
    }
  }

  return { init, cleanup, given, when, then };
}
