import { Dexie } from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { exportBackup, parseBackup, restoreBackup } from './backup';
import { KairoDB } from './database';
import {
  applyDueRecurring,
  deleteMoney,
  listAccounts,
  listMoneyCategories,
  listSavingsGoals,
  listTransactions,
  saveAccount,
  saveMoneyCategory,
  saveRecurring,
  saveSavingsGoal,
  saveTransaction,
  setAppMode,
  setCurrency,
  setupBudget,
  type TransactionInput,
} from './money';
import { getSettings } from './repo';
import { defaultSettings } from './schema';

let db: KairoDB;
let n = 0;
beforeEach(() => {
  db = new KairoDB(`money-${++n}`);
});
afterEach(async () => {
  await db.delete();
});

async function setup() {
  await setupBudget(db, {
    currency: 'EUR',
    accounts: [
      { id: 'bank', name: 'banque', kind: 'bank', openingCents: 100_000 },
      { id: 'cash', name: 'espèces', kind: 'cash', openingCents: 5_000 },
    ],
    categories: [
      {
        id: 'courses',
        name: 'courses',
        color: '#7EE2A8',
        kind: 'expense',
        monthlyLimitCents: 30_000,
      },
      { id: 'salaire', name: 'salaire', color: '#FFC861', kind: 'income', monthlyLimitCents: null },
    ],
  });
}

const expense = (over: Partial<TransactionInput> = {}): TransactionInput => ({
  kind: 'expense',
  amountCents: 1_250,
  date: '2026-11-23',
  accountId: 'bank',
  toAccountId: null,
  categoryId: 'courses',
  recurringId: null,
  note: '  marché ',
  ...over,
});

describe('Budget', () => {
  it('se configure : devise, comptes et catégories, puis passe en mode Budget', async () => {
    await setup();
    expect((await listAccounts(db)).map((a) => [a.name, a.order])).toEqual([
      ['Banque', 0],
      ['Espèces', 1],
    ]);
    expect((await listMoneyCategories(db)).map((c) => c.name)).toEqual(['Courses', 'Salaire']);
    expect(await getSettings(db)).toMatchObject({ currency: 'EUR', mode: 'budget' });
    await setAppMode(db, 'time');
    expect((await getSettings(db)).mode).toBe('time');
  });

  it('enregistre une opération et valide dépense, revenu et virement', async () => {
    await setup();
    const t = await saveTransaction(db, expense());
    expect(t).toMatchObject({ note: 'marché', deleted: 0 });
    await saveTransaction(db, expense({ kind: 'transfer', categoryId: null, toAccountId: 'cash' }));
    await expect(saveTransaction(db, expense({ categoryId: null }))).rejects.toThrow();
    await expect(
      saveTransaction(db, expense({ kind: 'transfer', categoryId: null, toAccountId: 'bank' })),
    ).rejects.toThrow();
    await expect(saveTransaction(db, expense({ amountCents: 0 }))).rejects.toThrow();
    expect(await listTransactions(db)).toHaveLength(2);
  });

  it('supprime avec annulation, et garde l’ordre des comptes à la modification', async () => {
    await setup();
    const t = await saveTransaction(db, expense());
    const undo = await deleteMoney(db, 'transactions', t.id);
    expect(await listTransactions(db)).toHaveLength(0);
    await undo();
    expect(await listTransactions(db)).toHaveLength(1);
    const renamed = await saveAccount(db, {
      id: 'cash',
      name: 'porte-monnaie',
      kind: 'cash',
      openingCents: 0,
    });
    expect(renamed).toMatchObject({ name: 'Porte-monnaie', order: 1 });
    const fresh = await saveAccount(db, { name: 'mobile', kind: 'mobile', openingCents: 0 });
    expect(fresh.order).toBe(2);
  });

  it('change de devise, ajoute une catégorie et liste les objectifs', async () => {
    await setup();
    await setCurrency(db, 'MUR');
    expect((await getSettings(db)).currency).toBe('MUR');
    const c = await saveMoneyCategory(db, {
      name: 'loisirs',
      color: '#FF8AD8',
      kind: 'expense',
      monthlyLimitCents: 5_000,
    });
    expect(c).toMatchObject({ name: 'Loisirs', order: 2 });
    const edited = await saveMoneyCategory(db, { ...c, monthlyLimitCents: null });
    expect(edited).toMatchObject({ order: 2, monthlyLimitCents: null });
    await saveSavingsGoal(db, {
      name: 'vacances',
      targetCents: 100_000,
      deadline: null,
      accountId: 'bank',
      savedCents: 0,
      color: '#5EE0D2',
    });
    expect((await listSavingsGoals(db)).map((g) => g.name)).toEqual(['Vacances']);
  });

  it('ajoute les échéances récurrentes passées une seule fois, même supprimées', async () => {
    await setup();
    await saveRecurring(db, {
      kind: 'income',
      amountCents: 150_000,
      accountId: 'bank',
      categoryId: 'salaire',
      dayOfMonth: 1,
      startDate: '2026-10-01',
      note: 'Paie',
      active: true,
    });
    expect(await applyDueRecurring(db, '2026-11-23')).toBe(2);
    expect(await applyDueRecurring(db, '2026-11-23')).toBe(0);
    const [first] = await listTransactions(db);
    if (!first) throw new Error('opération attendue');
    await deleteMoney(db, 'transactions', first.id);
    expect(await applyDueRecurring(db, '2026-11-23')).toBe(0);
  });

  it('migre une base v2 et sauvegarde le Budget', async () => {
    const name = `money-migration-${n}`;
    const v2 = new Dexie(name);
    v2.version(1).stores({
      categories: 'id, order, deleted',
      blocks: 'id, categoryId, deleted',
      completions: 'id, date, blockId',
      stepProgress: 'id',
      restDays: 'date',
      settings: 'id',
    });
    v2.version(2).stores({
      energy: 'id',
      goals: 'id, scope',
      reviews: 'id',
      suggestions: 'id, status, createdAt',
    });
    const old: Record<string, unknown> = { ...defaultSettings(), schemaVersion: 2 };
    delete old.mode;
    delete old.currency;
    await v2.table('settings').put(old);
    v2.close();
    const v3 = new KairoDB(name);
    expect(await getSettings(v3)).toMatchObject({ mode: 'time', currency: null, schemaVersion: 3 });
    await v3.delete();

    await setup();
    await saveTransaction(db, expense());
    await saveSavingsGoal(db, {
      name: 'téléphone',
      targetCents: 40_000,
      deadline: '2027-03-01',
      accountId: null,
      savedCents: 5_000,
      color: '#B4A5FF',
    });
    const backup = parseBackup(JSON.stringify(await exportBackup(db)));
    expect(backup.transactions).toHaveLength(1);
    const other = new KairoDB(`money-restore-${n}`);
    await restoreBackup(other, backup);
    expect(await other.accounts.count()).toBe(2);
    expect(await other.savingsGoals.count()).toBe(1);
    expect((await getSettings(other)).currency).toBe('EUR');
    await other.delete();
  });
});
