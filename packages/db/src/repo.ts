/**
 * Dépôts : la seule façon d'écrire dans la base. Chaque suppression est logique et renvoie
 * une fonction d'annulation (toast « Annuler » pendant 5 s).
 */
import { checkKey, copyDay, type CheckMap } from '@kairo/core';
import type { KairoDB } from './database';
import { uuidv7 } from './ids';
import {
  BlockSchema,
  CategorySchema,
  defaultSettings,
  type Block,
  type Category,
  type Options,
  type Profile,
  type Settings,
} from './schema';

export type Undo = () => Promise<void>;

const stamp = () => new Date().toISOString();

/** « salle » → « Salle », comme la maquette. */
export function capitalize(s: string): string {
  const t = s.trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// ---- Réglages

export async function getSettings(db: KairoDB): Promise<Settings> {
  return (await db.settings.get('app')) ?? defaultSettings();
}

export async function updateSettings(
  db: KairoDB,
  patch: Partial<Omit<Settings, 'id' | 'updatedAt' | 'schemaVersion'>>,
): Promise<Settings> {
  return db.transaction('rw', db.settings, async () => {
    const next: Settings = { ...(await getSettings(db)), ...patch, updatedAt: stamp() };
    await db.settings.put(next);
    return next;
  });
}

export async function updateProfile(db: KairoDB, patch: Partial<Profile>): Promise<Settings> {
  const s = await getSettings(db);
  return updateSettings(db, { profile: { ...s.profile, ...patch } });
}

export async function updateOptions(db: KairoDB, patch: Partial<Options>): Promise<Settings> {
  const s = await getSettings(db);
  return updateSettings(db, { options: { ...s.options, ...patch } });
}

// ---- Activités

export interface CategoryInput {
  name: string;
  color: string;
  weeklyGoalH: number;
}

export async function listCategories(db: KairoDB): Promise<Category[]> {
  const all = await db.categories.where('deleted').equals(0).toArray();
  return all.sort((a, b) => a.order - b.order);
}

export async function addCategory(db: KairoDB, input: CategoryInput): Promise<Category> {
  const last = await db.categories.orderBy('order').last();
  const cat = CategorySchema.parse({
    id: uuidv7(),
    name: capitalize(input.name),
    color: input.color,
    weeklyGoalH: input.weeklyGoalH,
    order: (last?.order ?? -1) + 1,
    updatedAt: stamp(),
    deleted: 0,
  });
  await db.categories.add(cat);
  return cat;
}

export async function updateCategory(db: KairoDB, id: string, input: CategoryInput): Promise<void> {
  const cur = await db.categories.get(id);
  if (!cur) throw new Error(`Activité inconnue : ${id}`);
  const next = CategorySchema.parse({
    ...cur,
    name: capitalize(input.name),
    color: input.color,
    weeklyGoalH: input.weeklyGoalH,
    updatedAt: stamp(),
  });
  await db.categories.put(next);
}

/** Supprime une activité et ses créneaux. */
export async function deleteCategory(db: KairoDB, id: string): Promise<Undo> {
  const blockIds = await db.transaction('rw', db.categories, db.blocks, async () => {
    const ids = (await db.blocks.where('categoryId').equals(id).toArray())
      .filter((b) => b.deleted === 0)
      .map((b) => b.id);
    await db.categories.update(id, { deleted: 1, updatedAt: stamp() });
    await db.blocks.bulkUpdate(
      ids.map((key) => ({ key, changes: { deleted: 1, updatedAt: stamp() } })),
    );
    return ids;
  });
  return async () => {
    await db.transaction('rw', db.categories, db.blocks, async () => {
      await db.categories.update(id, { deleted: 0, updatedAt: stamp() });
      await db.blocks.bulkUpdate(
        blockIds.map((key) => ({ key, changes: { deleted: 0, updatedAt: stamp() } })),
      );
    });
  };
}

// ---- Créneaux

export type BlockDraft = Omit<Block, 'id' | 'updatedAt' | 'deleted'> & { id?: string | null };

export async function listBlocks(db: KairoDB): Promise<Block[]> {
  return db.blocks.where('deleted').equals(0).toArray();
}

export async function saveBlock(db: KairoDB, draft: BlockDraft): Promise<Block> {
  const once = draft.once ?? null;
  const block = BlockSchema.parse({
    ...draft,
    id: draft.id ?? uuidv7(),
    once,
    days: once ? [] : [...new Set(draft.days)].sort((a, b) => a - b),
    steps: draft.steps.map((s) => s.trim()).filter(Boolean),
    note: draft.note.trim(),
    updatedAt: stamp(),
    deleted: 0,
  });
  if (!block.once && !block.days.length) throw new RangeError('Choisis au moins un jour');
  await db.blocks.put(block);
  return block;
}

export async function deleteBlock(db: KairoDB, id: string): Promise<Undo> {
  await db.blocks.update(id, { deleted: 1, updatedAt: stamp() });
  return async () => {
    await db.blocks.update(id, { deleted: 0, updatedAt: stamp() });
  };
}

/** « Copier un jour » vers d'autres jours de la semaine. */
export async function copyDayBlocks(
  db: KairoDB,
  source: number,
  targets: readonly number[],
): Promise<Undo> {
  const before = await listBlocks(db);
  const after = copyDay(before, source, targets);
  const changed = after.filter((b, i) => b !== before[i]);
  await db.blocks.bulkPut(changed.map((b) => ({ ...b, updatedAt: stamp() })));
  const previous = before.filter((b) => changed.some((c) => c.id === b.id));
  return async () => {
    await db.blocks.bulkPut(previous);
  };
}

// ---- Check-in, étapes, journées off

export async function setCheck(
  db: KairoDB,
  date: string,
  blockId: string,
  status: 'done' | 'missed' | null,
): Promise<void> {
  const id = checkKey(date, blockId);
  if (status === null) await db.completions.delete(id);
  else await db.completions.put({ id, date, blockId, status, updatedAt: stamp() });
}

export async function readChecks(db: KairoDB): Promise<CheckMap> {
  const out: Record<string, 'done' | 'missed'> = {};
  for (const c of await db.completions.toArray()) out[c.id] = c.status;
  return out;
}

export async function toggleStep(
  db: KairoDB,
  date: string,
  blockId: string,
  index: number,
): Promise<number[]> {
  const id = checkKey(date, blockId);
  return db.transaction('rw', db.stepProgress, async () => {
    const cur = (await db.stepProgress.get(id))?.done ?? [];
    const done = cur.includes(index)
      ? cur.filter((i) => i !== index)
      : [...cur, index].sort((a, b) => a - b);
    await db.stepProgress.put({ id, done, updatedAt: stamp() });
    return done;
  });
}

export async function toggleRestDay(db: KairoDB, date: string): Promise<boolean> {
  return db.transaction('rw', db.restDays, async () => {
    if (await db.restDays.get(date)) {
      await db.restDays.delete(date);
      return false;
    }
    await db.restDays.put({ date, updatedAt: stamp() });
    return true;
  });
}

/** « Tout effacer » : retour à l'accueil, en gardant langue, ambiance et réglages d'affichage. */
export async function resetAll(db: KairoDB): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    const s = await getSettings(db);
    await Promise.all(db.tables.map((t) => t.clear()));
    const fresh = defaultSettings();
    await db.settings.put({
      ...fresh,
      locale: s.locale,
      theme: s.theme,
      accent: s.accent,
      options: s.options,
    });
  });
}
