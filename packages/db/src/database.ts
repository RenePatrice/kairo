/** Base IndexedDB (Dexie). Les migrations sont numérotées : ajouter `this.version(N)…` sans toucher aux précédentes. */
import { Dexie, type EntityTable } from 'dexie';
import type {
  Block,
  Category,
  Completion,
  Energy,
  Goal,
  MoneyAccountRow,
  MoneyCategoryRow,
  MoneyRecurringRow,
  MoneyTransactionRow,
  RestDay,
  SavingsGoalRow,
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
  accounts!: EntityTable<MoneyAccountRow, 'id'>;
  moneyCategories!: EntityTable<MoneyCategoryRow, 'id'>;
  transactions!: EntityTable<MoneyTransactionRow, 'id'>;
  recurrings!: EntityTable<MoneyRecurringRow, 'id'>;
  savingsGoals!: EntityTable<SavingsGoalRow, 'id'>;

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
    // v3 : le Budget (comptes, catégories, opérations, récurrent, épargne) et le mode d'app.
    this.version(3)
      .stores({
        accounts: 'id, order, deleted',
        moneyCategories: 'id, order, deleted',
        transactions: 'id, date, accountId, categoryId, recurringId, deleted',
        recurrings: 'id, deleted',
        savingsGoals: 'id, deleted',
      })
      .upgrade(async (tx) => {
        await tx
          .table<Settings, 'id'>('settings')
          .toCollection()
          .modify((s) => {
            s.mode ??= 'time';
            s.currency ??= null;
            s.schemaVersion = 3;
          });
      });
  }
}
