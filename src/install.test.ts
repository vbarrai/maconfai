import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { setupScenario, skillFile } from './test-utils.ts';

describe('install', () => {
  const { init, cleanup, givenSkill, when, then, thenExists, getTargetDir } = setupScenario();

  beforeEach(() => init());
  afterEach(() => cleanup());

  describe('basic installation', () => {
    it('installs a skill to claude', async () => {
      await givenSkill('my-skill');

      await when({ skills: ['my-skill'], agents: ['claude-code'] });

      await then({ './.claude/skills/my-skill/SKILL.md': skillFile('my-skill') });
    });

    it('installs multiple skills to multiple agents', async () => {
      await givenSkill('skill-a', 'skill-b');

      await when({ skills: ['skill-a', 'skill-b'], agents: ['claude-code', 'cursor'] });

      await then({
        './.claude/skills/skill-a/SKILL.md': skillFile('skill-a'),
        './.claude/skills/skill-b/SKILL.md': skillFile('skill-b'),
        './.cursor/skills/skill-a/SKILL.md': skillFile('skill-a'),
        './.cursor/skills/skill-b/SKILL.md': skillFile('skill-b'),
      });
    });

    it('installs a skill to all agents', async () => {
      await givenSkill('shared');

      await when({ skills: ['shared'], agents: ['claude-code', 'cursor', 'codex'] });

      await then({
        './.claude/skills/shared/SKILL.md': skillFile('shared'),
        './.cursor/skills/shared/SKILL.md': skillFile('shared'),
        './.codex/skills/shared/SKILL.md': skillFile('shared'),
      });
    });
  });

  describe('--skills filter', () => {
    it('only installs specified skills', async () => {
      await givenSkill('wanted', 'unwanted');

      await when({ skills: ['wanted'], agents: ['claude-code'] });

      expect(await thenExists('.claude/skills/wanted/SKILL.md')).toBe(true);
      expect(await thenExists('.claude/skills/unwanted/SKILL.md')).toBe(false);
    });

    it('auto-selects all skills when no --skills filter', async () => {
      await givenSkill('alpha', 'beta');

      await when({ agents: ['claude-code'] });

      const alphaContent = await readFile(
        join(getTargetDir(), '.claude/skills/alpha/SKILL.md'),
        'utf-8'
      );
      const betaContent = await readFile(
        join(getTargetDir(), '.claude/skills/beta/SKILL.md'),
        'utf-8'
      );

      expect(alphaContent).toContain('alpha');
      expect(betaContent).toContain('beta');
    });
  });

  describe('--agents filter', () => {
    it('only installs to specified agents', async () => {
      await givenSkill('targeted');

      await when({ agents: ['cursor'] });

      expect(await thenExists('.cursor/skills/targeted/SKILL.md')).toBe(true);
      expect(await thenExists('.claude/skills/targeted/SKILL.md')).toBe(false);
      expect(await thenExists('.codex/skills/targeted/SKILL.md')).toBe(false);
    });

    it('auto-selects all agents when no --agents filter', async () => {
      await givenSkill('everywhere');

      await when({});

      expect(await thenExists('.claude/skills/everywhere/SKILL.md')).toBe(true);
      expect(await thenExists('.cursor/skills/everywhere/SKILL.md')).toBe(true);
      expect(await thenExists('.codex/skills/everywhere/SKILL.md')).toBe(true);
    });
  });

  describe('-y / --yes flag', () => {
    it('--yes long form works the same as -y', async () => {
      await givenSkill('long-form');

      await when({ agents: ['claude-code'] });

      const content = await readFile(
        join(getTargetDir(), '.claude/skills/long-form/SKILL.md'),
        'utf-8'
      );
      expect(content).toContain('long form');
    });

    it('skips confirmation and installs without interaction', async () => {
      await givenSkill('no-confirm');

      const { stdout } = await when({ agents: ['claude-code'] });

      expect(await thenExists('.claude/skills/no-confirm/SKILL.md')).toBe(true);
      expect(stdout).toContain('Done');
    });

    it('installs all skills to all agents when no filters given', async () => {
      await givenSkill('skill-x', 'skill-y');

      await when({});

      for (const agent of ['.claude', '.cursor', '.codex']) {
        for (const skill of ['skill-x', 'skill-y']) {
          expect(await thenExists(`${agent}/skills/${skill}/SKILL.md`)).toBe(true);
        }
      }
    });
  });
});
