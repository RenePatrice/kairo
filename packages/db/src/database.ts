/** Base IndexedDB (Dexie). Les migrations sont numérotées : ajouter `this.version(N)…` sans toucher aux précédentes. */
import { Dexie, type EntityTable } from 'dexie';
import type {
  Block,
  Category,
  Completion,
  Energy,
  Goal,
  RestDay,
  Review,
  Settings,
  StepProgress,
  Suggestion,
} from './schema';

export class KairoDB extends Dexie {
  categories!: EntityTable<Category, 'id'>;
  blocks!: EntityTable<Block, 'id'>;
  completions!: EntityTable<Completion, 'id'>;
  stepProgress!: EntityTable<StepProgress, 'id'>;
  restDays!: EntityTable<RestDay, 'date'>;
  settings!: EntityTable<Settings, 'id'>;
  energy!: EntityTable<Energy, 'id'>;
  goals!: EntityTable<Goal, 'id'>;
  reviews!: EntityTable<Review, 'id'>;
  suggestions!: EntityTable<Suggestion, 'id'>;

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
    // v2 (Phase 2) : énergie, objectifs, bilans, propositions de l'IA ; compteurs des trophées.
    this.version(2)
      .stores({
        energy: 'id',
        goals: 'id, scope',
        reviews: 'id',
        suggestions: 'id, status, createdAt',
      })
      .upgrade(async (tx) => {
        await tx
          .table<Settings, 'id'>('settings')
          .toCollection()
          .modify((s) => {
            s.trophiesSeen ??= [];
            s.focusCount ??= 0;
            s.schemaVersion = 2;
          });
      });
  }
}
