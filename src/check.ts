import * as p from '@clack/prompts';
import pc from 'picocolors';
import { spawnSync } from 'child_process';
import { readLock, fetchSkillFolderHash, getGitHubToken } from './lock.ts';
import type { SkillLockEntry } from './lock.ts';

export async function runCheck(): Promise<void> {
  console.log();
  p.intro(pc.bgCyan(pc.black(' confai check ')));

  const spinner = p.spinner();
  spinner.start('Reading lock file...');

  const lock = await readLock();
  const skillNames = Object.keys(lock.skills);

  if (skillNames.length === 0) {
    spinner.stop('No skills tracked');
    p.log.info('No globally installed skills to check.');
    p.log.info(`Install skills with: ${pc.cyan('confai install <source> -g')}`);
    p.outro('');
    return;
  }

  spinner.stop(`Found ${skillNames.length} tracked skill(s)`);

  const token = getGitHubToken();

  // Check each skill for updates
  spinner.start('Checking for updates...');

  const updates: Array<{ name: string; entry: SkillLockEntry }> = [];
  const skipped: Array<{ name: string; reason: string }> = [];
  const errors: Array<{ name: string; error: string }> = [];

  for (const name of skillNames) {
    const entry = lock.skills[name]!;

    if (!entry.skillFolderHash || !entry.skillPath) {
      skipped.push({ name, reason: 'No version hash' });
      continue;
    }

    try {
      const latestHash = await fetchSkillFolderHash(entry.source, entry.skillPath, token);

      if (!latestHash) {
        errors.push({ name, error: 'Could not fetch from GitHub' });
        continue;
      }

      if (latestHash !== entry.skillFolderHash) {
        updates.push({ name, entry });
      }
    } catch (err) {
      errors.push({
        name,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  spinner.stop('Check complete');
  console.log();

  if (updates.length === 0 && errors.length === 0) {
    p.log.success(pc.green('All skills are up to date'));
  }

  if (updates.length > 0) {
    p.log.info(`${updates.length} update(s) available:`);
    for (const u of updates) {
      p.log.message(`  ${pc.yellow('*')} ${u.name} ${pc.dim(`(${u.entry.source})`)}`);
    }

    console.log();
    const confirmed = await p.confirm({
      message: `Install ${updates.length} update(s)?`,
    });

    if (p.isCancel(confirmed) || !confirmed) {
      p.log.info('Skipped updates.');
      p.outro('');
      return;
    }

    // Update each skill
    const updateSpinner = p.spinner();
    updateSpinner.start('Updating skills...');

    let successCount = 0;
    let failCount = 0;

    for (const { name, entry } of updates) {
      // Build install URL from source
      let installUrl = entry.sourceUrl.replace(/\.git$/, '').replace(/\/$/, '');

      // Add subpath if available
      if (entry.skillPath) {
        let skillFolder = entry.skillPath;
        if (skillFolder.endsWith('/SKILL.md')) skillFolder = skillFolder.slice(0, -9);
        else if (skillFolder.endsWith('SKILL.md')) skillFolder = skillFolder.slice(0, -8);
        if (skillFolder.endsWith('/')) skillFolder = skillFolder.slice(0, -1);

        installUrl = `${installUrl}/tree/main/${skillFolder}`;
      }

      // Re-run install for this skill
      const result = spawnSync(
        process.execPath,
        [process.argv[1]!, 'install', installUrl, '-g', '-y'],
        {
          stdio: ['inherit', 'pipe', 'pipe'],
        }
      );

      if (result.status === 0) {
        successCount++;
        p.log.success(`Updated ${name}`);
      } else {
        failCount++;
        p.log.error(`Failed to update ${name}`);
      }
    }

    updateSpinner.stop('Updates complete');

    if (successCount > 0) {
      p.log.success(pc.green(`Updated ${successCount} skill(s)`));
    }
    if (failCount > 0) {
      p.log.error(pc.red(`Failed: ${failCount}`));
    }
  }

  if (skipped.length > 0) {
    console.log();
    p.log.info(pc.dim(`${skipped.length} skill(s) skipped (no version tracking)`));
    for (const s of skipped) {
      p.log.message(pc.dim(`  - ${s.name}: ${s.reason}`));
    }
  }

  if (errors.length > 0) {
    console.log();
    p.log.warn(`${errors.length} skill(s) could not be checked:`);
    for (const e of errors) {
      p.log.message(pc.dim(`  - ${e.name}: ${e.error}`));
    }
  }

  console.log();
  p.outro(pc.green('Done!'));
}
