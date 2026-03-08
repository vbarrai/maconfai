import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { setupScenario } from './test-utils.ts';

describe('install', () => {
  const { init, cleanup, given, when, then, thenExists, getTargetDir } = setupScenario();

  beforeEach(() => init());
  afterEach(() => cleanup());

  describe('basic installation', () => {
    it('installs a skill to claude', async () => {
      await given({
        './skills/my-skill/SKILL.md': '---\nname: my-skill\ndescription: foo\n---\nfoo',
      });

      await when({
        skills: ['my-skill'],
        agents: ['claude-code'],
      });

      await then({
        './.claude/skills/my-skill/SKILL.md': '---\nname: my-skill\ndescription: foo\n---\nfoo',
      });
    });

    it('installs multiple skills to multiple agents', async () => {
      await given({
        './skills/skill-a/SKILL.md': '---\nname: skill-a\ndescription: A\n---\nA content',
        './skills/skill-b/SKILL.md': '---\nname: skill-b\ndescription: B\n---\nB content',
      });

      await when({
        skills: ['skill-a', 'skill-b'],
        agents: ['claude-code', 'cursor'],
      });

      await then({
        './.claude/skills/skill-a/SKILL.md': '---\nname: skill-a\ndescription: A\n---\nA content',
        './.claude/skills/skill-b/SKILL.md': '---\nname: skill-b\ndescription: B\n---\nB content',
        './.cursor/skills/skill-a/SKILL.md': '---\nname: skill-a\ndescription: A\n---\nA content',
        './.cursor/skills/skill-b/SKILL.md': '---\nname: skill-b\ndescription: B\n---\nB content',
      });
    });

    it('installs a skill to all agents', async () => {
      await given({
        './skills/shared/SKILL.md': '---\nname: shared\ndescription: shared skill\n---\nshared',
      });

      await when({
        skills: ['shared'],
        agents: ['claude-code', 'cursor', 'codex'],
      });

      await then({
        './.claude/skills/shared/SKILL.md': '---\nname: shared\ndescription: shared skill\n---\nshared',
        './.cursor/skills/shared/SKILL.md': '---\nname: shared\ndescription: shared skill\n---\nshared',
        './.codex/skills/shared/SKILL.md': '---\nname: shared\ndescription: shared skill\n---\nshared',
      });
    });
  });

  describe('--skills filter', () => {
    it('only installs specified skills', async () => {
      await given({
        './skills/wanted/SKILL.md': '---\nname: wanted\ndescription: I am wanted\n---\nI am wanted',
        './skills/unwanted/SKILL.md': '---\nname: unwanted\ndescription: I am not wanted\n---\nI am not wanted',
      });

      await when({ skills: ['wanted'], agents: ['claude-code'] });

      expect(await thenExists('.claude/skills/wanted/SKILL.md')).toBe(true);
      expect(await thenExists('.claude/skills/unwanted/SKILL.md')).toBe(false);
    });

    it('auto-selects all skills when no --skills filter', async () => {
      await given({
        './skills/alpha/SKILL.md': '---\nname: alpha\ndescription: Alpha skill\n---\nAlpha skill',
        './skills/beta/SKILL.md': '---\nname: beta\ndescription: Beta skill\n---\nBeta skill',
      });

      await when({ agents: ['claude-code'] });

      const alphaContent = await readFile(
        join(getTargetDir(), '.claude/skills/alpha/SKILL.md'),
        'utf-8'
      );
      const betaContent = await readFile(
        join(getTargetDir(), '.claude/skills/beta/SKILL.md'),
        'utf-8'
      );

      expect(alphaContent).toContain('Alpha skill');
      expect(betaContent).toContain('Beta skill');
    });
  });

  describe('--agents filter', () => {
    it('only installs to specified agents', async () => {
      await given({
        './skills/targeted/SKILL.md': '---\nname: targeted\ndescription: Targeted skill\n---\nTargeted skill',
      });

      await when({ agents: ['cursor'] });

      expect(await thenExists('.cursor/skills/targeted/SKILL.md')).toBe(true);
      expect(await thenExists('.claude/skills/targeted/SKILL.md')).toBe(false);
      expect(await thenExists('.codex/skills/targeted/SKILL.md')).toBe(false);
    });

    it('auto-selects all agents when no --agents filter', async () => {
      await given({
        './skills/everywhere/SKILL.md': '---\nname: everywhere\ndescription: Goes everywhere\n---\nGoes everywhere',
      });

      await when({});

      expect(await thenExists('.claude/skills/everywhere/SKILL.md')).toBe(true);
      expect(await thenExists('.cursor/skills/everywhere/SKILL.md')).toBe(true);
      expect(await thenExists('.codex/skills/everywhere/SKILL.md')).toBe(true);
    });
  });

  describe('-y / --yes flag', () => {
    it('--yes long form works the same as -y', async () => {
      await given({
        './skills/long-form/SKILL.md': '---\nname: long-form\ndescription: Long form test\n---\nLong form test',
      });

      await when({ agents: ['claude-code'] });

      const content = await readFile(
        join(getTargetDir(), '.claude/skills/long-form/SKILL.md'),
        'utf-8'
      );
      expect(content).toContain('Long form test');
    });

    it('skips confirmation and installs without interaction', async () => {
      await given({
        './skills/no-confirm/SKILL.md': '---\nname: no-confirm\ndescription: No confirmation needed\n---\nNo confirmation needed',
      });

      const { stdout } = await when({ agents: ['claude-code'] });

      expect(await thenExists('.claude/skills/no-confirm/SKILL.md')).toBe(true);
      expect(stdout).toContain('Done');
    });

    it('installs all skills to all agents when no filters given', async () => {
      await given({
        './skills/skill-x/SKILL.md': '---\nname: skill-x\ndescription: Skill X\n---\nSkill X',
        './skills/skill-y/SKILL.md': '---\nname: skill-y\ndescription: Skill Y\n---\nSkill Y',
      });

      await when({});

      for (const agent of ['.claude', '.cursor', '.codex']) {
        for (const skill of ['skill-x', 'skill-y']) {
          expect(await thenExists(`${agent}/skills/${skill}/SKILL.md`)).toBe(true);
        }
      }
    });
  });
});
