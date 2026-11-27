/**
 * Dépôts du Budget : comptes, catégories, opérations, récurrent et objectifs d'épargne.
 * Les suppressions sont logiques et renvoient une annulation (toast « Annuler » 5 s).
 */
import { recurringToCreate } from '@kairo/core';
import type { KairoDB } from './database';
import { uuidv7 } from './ids';
import { capitalize, updateSettings, type Undo } from './repo';
import {
  MoneyAccountSchema,
  MoneyCategorySchema,
  MoneyRecurringSchema,
  MoneyTransactionSchema,
  SavingsGoalSchema,
  type MoneyAccountRow,
  type MoneyCategoryRow,
  type MoneyRecurringRow,
  type MoneyTransactionRow,
  type SavingsGoalRow,
} from './schema';

const stamp = () => new Date().toISOString();

type Fields = 'id' | 'order' | 'updatedAt' | 'deleted';
export type AccountInput = Omit<MoneyAccountRow, Fields> & { id?: string | null };
export type MoneyCategoryInput = Omit<MoneyCategoryRow, Fields> & { id?: string | null };
export type TransactionInput = Omit<MoneyTransactionRow, 'id' | 'updatedAt' | 'deleted'> & {
  id?: string | null;
};
export type RecurringInput = Omit<MoneyRecurringRow, 'id' | 'updatedAt' | 'deleted'> & {
  id?: string | null;
};
export type SavingsGoalInput = Omit<SavingsGoalRow, 'id' | 'updatedAt' | 'deleted'> & {
  id?: string | null;
};

const live = <T extends { deleted: 0 | 1 }>(rows: T[]) => rows.filter((r) => r.deleted === 0);
const byOrder = <T extends { order: number }>(rows: T[]) => rows.sort((a, b) => a.order - b.order);

/** Première ouverture du Budget : devise, comptes et catégories de départ. */
export async function setupBudget(
  db: KairoDB,
  input: { currency: string; accounts: AccountInput[]; categories: MoneyCategoryInput[] },
): Promise<void> {
  await db.transaction('rw', db.accounts, db.moneyCategories, db.settings, async () => {
    const now = stamp();
    await db.accounts.bulkAdd(
      input.accounts.map((a, order) =>
        MoneyAccountSchema.parse({
          ...a,
          id: a.id ?? uuidv7(),
          name: capitalize(a.name),
          order,
          updatedAt: now,
          deleted: 0,
        }),
      ),
    );
    await db.moneyCategories.bulkAdd(
      input.categories.map((c, order) =>
        MoneyCategorySchema.parse({
          ...c,
          id: c.id ?? uuidv7(),
          name: capitalize(c.name),
          order,
          updatedAt: now,
          deleted: 0,
        }),
      ),
    );
    await updateSettings(db, { currency: input.currency, mode: 'budget' });
  });
}

export async function setAppMode(db: KairoDB, mode: 'time' | 'budget'): Promise<void> {
  await updateSettings(db, { mode });
}

export async function setCurrency(db: KairoDB, currency: string): Promise<void> {
  await updateSettings(db, { currency });
}

// ---- Comptes

export async function listAccounts(db: KairoDB): Promise<MoneyAccountRow[]> {
  return byOrder(live(await db.accounts.toArray()));
}

export async function saveAccount(db: KairoDB, input: AccountInput): Promise<MoneyAccountRow> {
  const current = input.id ? await db.accounts.get(input.id) : undefined;
  const last = await db.accounts.orderBy('order').last();
  const row = MoneyAccountSchema.parse({
    ...input,
    id: input.id ?? uuidv7(),
    name: capitalize(input.name),
    order: current?.order ?? (last?.order ?? -1) + 1,
    updatedAt: stamp(),
    deleted: 0,
  });
  await db.accounts.put(row);
  return row;
}

// ---- Catégories

export async function listMoneyCategories(db: KairoDB): Promise<MoneyCategoryRow[]> {
  return byOrder(live(await db.moneyCategories.toArray()));
}

export async function saveMoneyCategory(
  db: KairoDB,
  input: MoneyCategoryInput,
): Promise<MoneyCategoryRow> {
  const current = input.id ? await db.moneyCategories.get(input.id) : undefined;
  const last = await db.moneyCategories.orderBy('order').last();
  const row = MoneyCategorySchema.parse({
    ...input,
    id: input.id ?? uuidv7(),
    name: capitalize(input.name),
    order: current?.order ?? (last?.order ?? -1) + 1,
    updatedAt: stamp(),
    deleted: 0,
  });
  await db.moneyCategories.put(row);
  return row;
}

// ---- Opérations

export async function listTransactions(db: KairoDB): Promise<MoneyTransactionRow[]> {
  return live(await db.transactions.toArray()).sort(
    (a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt),
  );
}

export async function saveTransaction(
  db: KairoDB,
  input: TransactionInput,
): Promise<MoneyTransactionRow> {
  const row = MoneyTransactionSchema.parse({
    ...input,
    id: input.id ?? uuidv7(),
    note: input.note.trim(),
    updatedAt: stamp(),
    deleted: 0,
  });
  await db.transactions.put(row);
  return row;
}

// ---- Récurrent

export async function listRecurrings(db: KairoDB): Promise<MoneyRecurringRow[]> {
  return live(await db.recurrings.toArray());
}

export async function saveRecurring(
  db: KairoDB,
  input: RecurringInput,
): Promise<MoneyRecurringRow> {
  const row = MoneyRecurringSchema.parse({
    ...input,
    id: input.id ?? uuidv7(),
    note: input.note.trim(),
    updatedAt: stamp(),
    deleted: 0,
  });
  await db.recurrings.put(row);
  return row;
}

/**
 * Ajoute les échéances récurrentes passées pas encore enregistrées (loyer, salaire…), une seule
 * fois chacune. Renvoie le nombre d'opérations créées.
 */
export async function applyDueRecurring(db: KairoDB, today: string): Promise<number> {
  return db.transaction('rw', db.recurrings, db.transactions, async () => {
    const recurring = await listRecurrings(db);
    // Une échéance supprimée à la main ne doit pas revenir : on compte aussi les supprimées.
    const all = await db.transactions.toArray();
    const due = recurringToCreate(recurring, all, today);
    const now = stamp();
    const rows = due.flatMap((d) => {
      const r = recurring.find((x) => x.id === d.recurringId);
      if (!r) return [];
      return [
        MoneyTransactionSchema.parse({
          id: uuidv7(),
          kind: r.kind,
          amountCents: r.amountCents,
          date: d.date,
          accountId: r.accountId,
          toAccountId: null,
          categoryId: r.categoryId,
          recurringId: r.id,
          note: r.note,
          updatedAt: now,
          deleted: 0,
        }),
      ];
    });
    await db.transactions.bulkAdd(rows);
    return rows.length;
  });
}

// ---- Épargne

export async function listSavingsGoals(db: KairoDB): Promise<SavingsGoalRow[]> {
  return live(await db.savingsGoals.toArray());
}

export async function saveSavingsGoal(
  db: KairoDB,
  input: SavingsGoalInput,
): Promise<SavingsGoalRow> {
  const row = SavingsGoalSchema.parse({
    ...input,
    id: input.id ?? uuidv7(),
    name: capitalize(input.name),
    updatedAt: stamp(),
    deleted: 0,
  });
  await db.savingsGoals.put(row);
  return row;
}

// ---- Suppression (logique, annulable)

type MoneyTable = 'accounts' | 'moneyCategories' | 'transactions' | 'recurrings' | 'savingsGoals';

/** Supprime une ligne du Budget ; renvoie l'annulation. */
export async function deleteMoney(db: KairoDB, table: MoneyTable, id: string): Promise<Undo> {
  await db.table(table).update(id, { deleted: 1, updatedAt: stamp() });
  return async () => {
    await db.table(table).update(id, { deleted: 0, updatedAt: stamp() });
  };
}
