/**
 * Suivi de la Phase 2 : note d'énergie, objectifs, bilans, trophées vus, sessions focus.
 */
import { checkKey, type EnergyLevel, type EnergyMap } from '@kairo/core';
import type { KairoDB } from './database';
import { getSettings, updateSettings } from './repo';
import { GoalSchema, ReviewSchema, type Goal, type Review } from './schema';

const stamp = () => new Date().toISOString();

export async function setEnergy(
  db: KairoDB,
  date: string,
  blockId: string,
  level: EnergyLevel,
): Promise<void> {
  await db.energy.put({ id: checkKey(date, blockId), level, updatedAt: stamp() });
}

export async function readEnergy(db: KairoDB): Promise<EnergyMap> {
  const out: Record<string, EnergyLevel> = {};
  for (const e of await db.energy.toArray()) out[e.id] = e.level;
  return out;
}

/** `Omit` distributif : garde `categoryId` des objectifs de semaine. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export type GoalInput = DistributiveOmit<Goal, 'updatedAt'>;

export async function saveGoal(db: KairoDB, input: GoalInput): Promise<Goal> {
  const goal = GoalSchema.parse({ ...input, text: input.text.trim(), updatedAt: stamp() });
  await db.goals.put(goal);
  return goal;
}

export async function deleteGoal(db: KairoDB, id: string): Promise<void> {
  await db.goals.delete(id);
}

export type ReviewInput = Omit<Review, 'updatedAt'>;

export async function saveReview(db: KairoDB, input: ReviewInput): Promise<Review> {
  const review = ReviewSchema.parse({
    ...input,
    a: input.a.trim(),
    b: input.b.trim(),
    updatedAt: stamp(),
  });
  await db.reviews.put(review);
  return review;
}

/** Enregistre plusieurs bilans (bilans automatiques) sans écraser ceux qui existent. */
export async function addReviews(db: KairoDB, inputs: readonly ReviewInput[]): Promise<number> {
  return db.transaction('rw', db.reviews, async () => {
    const existing = new Set(await db.reviews.toCollection().primaryKeys());
    const fresh = inputs
      .filter((r) => !existing.has(r.id))
      .map((r) => ReviewSchema.parse({ ...r, updatedAt: stamp() }));
    await db.reviews.bulkPut(fresh);
    return fresh.length;
  });
}

export async function markTrophiesSeen(db: KairoDB, ids: readonly string[]): Promise<void> {
  if (!ids.length) return;
  const s = await getSettings(db);
  await updateSettings(db, { trophiesSeen: [...new Set([...s.trophiesSeen, ...ids])] });
}

export async function countFocusSession(db: KairoDB): Promise<number> {
  const s = await getSettings(db);
  const focusCount = s.focusCount + 1;
  await updateSettings(db, { focusCount });
  return focusCount;
}
