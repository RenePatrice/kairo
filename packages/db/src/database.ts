/** Base IndexedDB (Dexie). Les migrations sont numérotées : ajouter `this.version(2)…` sans toucher à la 1. */
import { Dexie, type EntityTable } from 'dexie';
import type { Block, Category, Completion, RestDay, Settings, StepProgress } from './schema';

export class KairoDB extends Dexie {
  categories!: EntityTable<Category, 'id'>;
  blocks!: EntityTable<Block, 'id'>;
  completions!: EntityTable<Completion, 'id'>;
  stepProgress!: EntityTable<StepProgress, 'id'>;
  restDays!: EntityTable<RestDay, 'date'>;
  settings!: EntityTable<Settings, 'id'>;

  constructor(name = 'kairo') {
    super(name);
    this.version(1).stores({
      categories: 'id, order, deleted',
      blocks: 'id, categoryId, deleted',
      completions: 'id, date, blockId',
      stepProgress: 'id',
      restDays: 'date',
      settings: 'id',
    });
  }
}
