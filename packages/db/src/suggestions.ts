/**
 * L'IA propose, le code applique : une proposition est enregistrée « pending », puis appliquée
 * d'un bloc (une seule transaction) quand l'utilisateur touche « Valider », annulable 5 s.
 */
import { AiSuggestion } from '@kairo/ai';
import type { KairoDB } from './database';
import { capitalize, type Undo } from './repo';
import {
  BlockSchema,
  CategorySchema,
  SuggestionSchema,
  type Block,
  type Suggestion,
} from './schema';

const stamp = () => new Date().toISOString();

export class SuggestionError extends Error {}

export async function saveSuggestion(db: KairoDB, suggestion: AiSuggestion): Promise<Suggestion> {
  const row = SuggestionSchema.parse({ ...AiSuggestion.parse(suggestion), updatedAt: stamp() });
  await db.suggestions.put(row);
  return row;
}

export async function dismissSuggestion(db: KairoDB, id: string): Promise<void> {
  await db.suggestions.update(id, { status: 'dismissed', updatedAt: stamp() });
}

/**
 * Applique une proposition en attente. Tout ou rien : si un créneau visé n'existe plus ou si une
 * activité est inconnue, rien n'est écrit et `SuggestionError` est levée.
 */
export async function applySuggestion(db: KairoDB, id: string): Promise<Undo> {
  const tables = [db.suggestions, db.categories, db.blocks];
  const done = await db.transaction('rw', tables, async () => {
    const row = await db.suggestions.get(id);
    if (!row) throw new SuggestionError('unknown');
    if (row.status !== 'pending') throw new SuggestionError('not-pending');
    const s = AiSuggestion.parse(row);
    const now = stamp();

    const liveCategories = new Set(
      (await db.categories.where('deleted').equals(0).primaryKeys()).map(String),
    );
    const last = await db.categories.orderBy('order').last();
    let order = (last?.order ?? -1) + 1;
    const createdCategories: string[] = [];
    const createdBlocks: string[] = [];
    const previous: Block[] = [];

    for (const op of s.operations) {
      if (op.op === 'add_category') {
        const c = op.category;
        await db.categories.add(
          CategorySchema.parse({
            ...c,
            name: capitalize(c.name),
            order: order++,
            updatedAt: now,
            deleted: 0,
          }),
        );
        liveCategories.add(c.id);
        createdCategories.push(c.id);
      } else if (op.op === 'add') {
        if (!liveCategories.has(op.block.categoryId)) throw new SuggestionError('unknown-category');
        await db.blocks.add(BlockSchema.parse({ ...op.block, updatedAt: now, deleted: 0 }));
        createdBlocks.push(op.block.id);
      } else {
        const cur = await db.blocks.get(op.blockId);
        if (!cur || cur.deleted) throw new SuggestionError('unknown-block');
        previous.push(cur);
        const next =
          op.op === 'delete'
            ? { ...cur, deleted: 1 as const, updatedAt: now }
            : BlockSchema.parse({ ...cur, ...op.patch, updatedAt: now });
        await db.blocks.put(next);
      }
    }
    await db.suggestions.update(id, { status: 'applied', updatedAt: now });
    return { createdCategories, createdBlocks, previous };
  });

  return async () => {
    await db.transaction('rw', tables, async () => {
      const now = stamp();
      // Créés par cette proposition : ils n'existaient pas avant, on les retire vraiment
      // (la proposition peut ainsi être validée de nouveau avec les mêmes identifiants).
      await db.blocks.bulkDelete(done.createdBlocks);
      await db.categories.bulkDelete(done.createdCategories);
      await db.blocks.bulkPut(done.previous);
      await db.suggestions.update(id, { status: 'pending', updatedAt: now });
    });
  };
}
