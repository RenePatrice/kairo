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
    energy: await db.energy.toArray(),
    goals: await db.goals.toArray(),
    reviews: await db.reviews.toArray(),
    suggestions: await db.suggestions.toArray(),
    accounts: await db.accounts.toArray(),
    moneyCategories: await db.moneyCategories.toArray(),
    transactions: await db.transactions.toArray(),
    recurrings: await db.recurrings.toArray(),
    savingsGoals: await db.savingsGoals.toArray(),
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
    await db.energy.bulkPut(backup.energy);
    await db.goals.bulkPut(backup.goals);
    await db.reviews.bulkPut(backup.reviews);
    await db.suggestions.bulkPut(backup.suggestions);
    await db.accounts.bulkPut(backup.accounts);
    await db.moneyCategories.bulkPut(backup.moneyCategories);
    await db.transactions.bulkPut(backup.transactions);
    await db.recurrings.bulkPut(backup.recurrings);
    await db.savingsGoals.bulkPut(backup.savingsGoals);
  });
}
