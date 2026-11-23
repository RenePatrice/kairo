import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BackupError, backupFileName, exportBackup, parseBackup, restoreBackup } from './backup';
import { KairoDB } from './database';
import { DB_VERSION } from './schema';
import {
  addCategory,
  getSettings,
  listBlocks,
  readChecks,
  saveBlock,
  setCheck,
  toggleRestDay,
  toggleStep,
  updateProfile,
} from './repo';

let db: KairoDB;
let other: KairoDB;
let n = 0;
beforeEach(() => {
  db = new KairoDB(`backup-${++n}`);
  other = new KairoDB(`backup-other-${n}`);
});
afterEach(async () => {
  await db.delete();
  await other.delete();
});

async function fill() {
  await updateProfile(db, { name: 'Camille' });
  const a = await addCategory(db, { name: 'Salle', color: '#B4A5FF', weeklyGoalH: 5 });
  const b = await saveBlock(db, {
    categoryId: a.id,
    days: [1],
    once: null,
    startMin: 1080,
    endMin: 1140,
    reminderMin: null,
    steps: ['Échauffement'],
    note: '',
  });
  await setCheck(db, '2026-11-24', b.id, 'done');
  await toggleStep(db, '2026-11-24', b.id, 0);
  await toggleRestDay(db, '2026-11-29');
  return b;
}

describe('sauvegarde', () => {
  it('exporte puis restaure toute la base', async () => {
    const b = await fill();
    const backup = await exportBackup(db, new Date('2026-11-22T10:00:00Z'));
    expect(backup).toMatchObject({ app: 'kairo', schemaVersion: DB_VERSION });
    const parsed = parseBackup(JSON.stringify(backup));
    await restoreBackup(other, parsed);
    expect((await getSettings(other)).profile.name).toBe('Camille');
    expect(await listBlocks(other)).toHaveLength(1);
    expect(await readChecks(other)).toEqual({ [`2026-11-24|${b.id}`]: 'done' });
    expect(await other.restDays.count()).toBe(1);
    expect(await other.stepProgress.count()).toBe(1);
  });

  it('remplace les données existantes', async () => {
    await fill();
    const empty = await exportBackup(other);
    await restoreBackup(db, empty);
    expect(await listBlocks(db)).toEqual([]);
  });

  it('refuse un fichier qui n’est pas une sauvegarde Kairo', () => {
    expect(() => parseBackup('pas du json')).toThrow(BackupError);
    expect(() => parseBackup('{"app":"autre"}')).toThrow(BackupError);
  });

  it('refuse un créneau sans activité', async () => {
    await fill();
    const backup = await exportBackup(db);
    const broken = { ...backup, categories: [] };
    expect(() => parseBackup(JSON.stringify(broken))).toThrow(BackupError);
  });

  it('refuse une version plus récente que l’app', async () => {
    const backup = { ...(await exportBackup(db)), schemaVersion: 99 };
    expect(() => parseBackup(JSON.stringify(backup))).toThrow(BackupError);
  });

  it('nomme le fichier avec la date', () => {
    expect(backupFileName(new Date('2026-11-22T10:00:00Z'))).toBe(
      'kairo-sauvegarde-2026-11-22.json',
    );
  });
});
