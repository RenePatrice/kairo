/** Sauvegarde / restauration JSON : toute la base + `schemaVersion`, validée par Zod à l'import. */
import type { KairoDB } from './database';
import { getSettings } from './repo';
import { BackupSchema, DB_VERSION, type Backup } from './schema';

export async function exportBackup(db: KairoDB, now = new Date()): Promise<Backup> {
  return {
    app: 'kairo',
    schemaVersion: DB_VERSION,
    exportedAt: now.toISOString(),
    settings: await getSettings(db),
    categories: await db.categories.toArray(),
    blocks: await db.blocks.toArray(),
    completions: await db.completions.toArray(),
    stepProgress: await db.stepProgress.toArray(),
    restDays: await db.restDays.toArray(),
  };
}

export function backupFileName(now = new Date()): string {
  return `kairo-sauvegarde-${now.toISOString().slice(0, 10)}.json`;
}

export class BackupError extends Error {}

/** Lit un fichier de sauvegarde ; lève `BackupError` s'il n'est pas valide. */
export function parseBackup(text: string): Backup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupError('invalid-json');
  }
  const res = BackupSchema.safeParse(raw);
  if (!res.success) throw new BackupError('invalid-backup');
  const ids = new Set(res.data.categories.map((c) => c.id));
  if (res.data.blocks.some((b) => !ids.has(b.categoryId))) throw new BackupError('invalid-backup');
  return res.data;
}

/** Remplace toute la base par la sauvegarde. */
export async function restoreBackup(db: KairoDB, backup: Backup): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
    await db.settings.put({ ...backup.settings, schemaVersion: DB_VERSION });
    await db.categories.bulkPut(backup.categories);
    await db.blocks.bulkPut(backup.blocks);
    await db.completions.bulkPut(backup.completions);
    await db.stepProgress.bulkPut(backup.stepProgress);
    await db.restDays.bulkPut(backup.restDays);
  });
}
