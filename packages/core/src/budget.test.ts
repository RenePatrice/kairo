import { describe, expect, it } from 'vitest';
import {
  accountBalance,
  addMonths,
  daysInMonth,
  dueBetween,
  dueDate,
  envelopeCrossings,
  envelopes,
  goalProgress,
  monthHistory,
  monthKeyOf,
  monthSummary,
  parseAmount,
  parseSignedAmount,
  recurringToCreate,
  remainingToSpend,
  topCategories,
  totalBalance,
  upcomingDue,
  type MoneyAccount,
  type MoneyCategory,
  type MoneyRecurring,
  type MoneyTransaction,
} from './budget';

const bank: MoneyAccount = { id: 'bank', name: 'Banque', kind: 'bank', openingCents: 100_000 };
const cash: MoneyAccount = { id: 'cash', name: 'Espèces', kind: 'cash', openingCents: 5_000 };
const accounts = [bank, cash];

const categories: MoneyCategory[] = [
  { id: 'courses', name: 'Courses', kind: 'expense', monthlyLimitCents: 30_000 },
  { id: 'loyer', name: 'Logement', kind: 'expense', monthlyLimitCents: 50_000 },
  { id: 'transport', name: 'Transport', kind: 'expense', monthlyLimitCents: null },
  { id: 'salaire', name: 'Salaire', kind: 'income', monthlyLimitCents: null },
];

const tx = (
  id: string,
  kind: MoneyTransaction['kind'],
  amountCents: number,
  date: string,
  extra: Partial<MoneyTransaction> = {},
): MoneyTransaction => ({
  id,
  kind,
  amountCents,
  date,
  accountId: 'bank',
  toAccountId: null,
  categoryId: null,
  recurringId: null,
  ...extra,
});

/** Novembre 2026 : salaire, loyer (récurrent), courses sur deux comptes, un virement. */
const txs: MoneyTransaction[] = [
  tx('t1', 'income', 150_000, '2026-11-01', { categoryId: 'salaire', recurringId: 'r-sal' }),
  tx('t2', 'expense', 45_000, '2026-11-05', { categoryId: 'loyer', recurringId: 'r-loyer' }),
  tx('t3', 'expense', 12_000, '2026-11-10', { categoryId: 'courses' }),
  tx('t4', 'transfer', 5_000, '2026-11-15', { toAccountId: 'cash' }),
  tx('t5', 'expense', 13_000, '2026-11-20', { categoryId: 'courses', accountId: 'cash' }),
  tx('t6', 'expense', 20_000, '2026-10-12', { categoryId: 'courses' }),
];

const loyer: MoneyRecurring = {
  id: 'r-loyer',
  kind: 'expense',
  amountCents: 45_000,
  accountId: 'bank',
  categoryId: 'loyer',
  dayOfMonth: 5,
  startDate: '2026-09-01',
  active: true,
};

const recurring: MoneyRecurring[] = [
  loyer,
  {
    id: 'r-sal',
    kind: 'income',
    amountCents: 150_000,
    accountId: 'bank',
    categoryId: 'salaire',
    dayOfMonth: 1,
    startDate: '2026-11-01',
    active: true,
  },
  {
    id: 'r-net',
    kind: 'expense',
    amountCents: 3_000,
    accountId: 'bank',
    categoryId: 'transport',
    dayOfMonth: 28,
    startDate: '2026-11-01',
    active: true,
  },
  {
    id: 'r-off',
    kind: 'expense',
    amountCents: 999,
    accountId: 'bank',
    categoryId: 'transport',
    dayOfMonth: 2,
    startDate: '2026-01-01',
    active: false,
  },
];

describe('montants et mois', () => {
  it('lit les montants saisis en centimes', () => {
    expect(parseAmount('12')).toBe(1200);
    expect(parseAmount('12,5')).toBe(1250);
    expect(parseAmount('12.50')).toBe(1250);
    expect(parseAmount('1 250,00')).toBe(125_000);
    expect(parseAmount('0')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount('12,345')).toBeNull();
  });

  it('lit un solde signé (découvert)', () => {
    expect(parseSignedAmount('-50')).toBe(-5_000);
    expect(parseSignedAmount('−12,5')).toBe(-1_250);
    expect(parseSignedAmount('1000')).toBe(100_000);
    expect(parseSignedAmount('')).toBe(0);
    expect(parseSignedAmount('0,00')).toBe(0);
    expect(parseSignedAmount('-abc')).toBeNull();
  });

  it('manipule les mois', () => {
    expect(monthKeyOf('2026-11-23')).toBe('2026-11');
    expect(monthKeyOf(new Date(2026, 10, 23))).toBe('2026-11');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(daysInMonth('2028-02')).toBe(29);
  });
});

describe('comptes', () => {
  it('calcule le solde de chaque compte, virements compris', () => {
    expect(accountBalance(bank, txs)).toBe(100_000 + 150_000 - 45_000 - 12_000 - 20_000 - 5_000);
    expect(accountBalance(cash, txs)).toBe(5_000 + 5_000 - 13_000);
    expect(accountBalance(bank, txs, '2026-11-12')).toBe(
      100_000 - 20_000 + 150_000 - 45_000 - 12_000,
    );
  });

  it('donne le solde total, où les virements s’annulent', () => {
    expect(totalBalance(accounts, txs)).toBe(105_000 + 150_000 - 45_000 - 25_000 - 20_000);
  });
});

describe('mois et enveloppes', () => {
  it('résume le mois sans compter les virements', () => {
    expect(monthSummary(txs, '2026-11')).toEqual({
      incomeCents: 150_000,
      expenseCents: 70_000,
      netCents: 80_000,
      byCategory: { salaire: 150_000, loyer: 45_000, courses: 25_000 },
    });
  });

  it('suit les enveloppes : alerte à 80 %, dépassement à 100 %', () => {
    expect(envelopes(categories, txs, '2026-11')).toEqual([
      {
        categoryId: 'courses',
        limitCents: 30_000,
        spentCents: 25_000,
        leftCents: 5_000,
        ratio: 25 / 30,
        status: 'warn',
      },
      {
        categoryId: 'loyer',
        limitCents: 50_000,
        spentCents: 45_000,
        leftCents: 5_000,
        ratio: 0.9,
        status: 'warn',
      },
    ]);
    const over = envelopes(
      categories,
      [...txs, tx('x', 'expense', 6_000, '2026-11-22', { categoryId: 'courses' })],
      '2026-11',
    );
    expect(over[0]).toMatchObject({ status: 'over', leftCents: -1_000 });
  });

  it('repère les enveloppes qui viennent de passer un seuil', () => {
    const before = envelopes(
      categories,
      txs.filter((t) => t.id !== 't5'),
      '2026-11',
    );
    const after = envelopes(categories, txs, '2026-11');
    expect(envelopeCrossings(before, after).map((e) => e.categoryId)).toEqual(['courses']);
    expect(envelopeCrossings(after, after)).toEqual([]);
  });
});

describe('récurrent', () => {
  it('ramène l’échéance au dernier jour d’un mois court', () => {
    expect(dueDate({ ...loyer, dayOfMonth: 31 }, '2027-02')).toBe('2027-02-28');
  });

  it('liste les échéances d’une période depuis la date de début', () => {
    expect(dueBetween([loyer], '2026-08-01', '2026-11-30').map((d) => d.date)).toEqual([
      '2026-09-05',
      '2026-10-05',
      '2026-11-05',
    ]);
  });

  it('crée les échéances passées oubliées, une seule fois', () => {
    expect(recurringToCreate(recurring, txs, '2026-11-23')).toEqual([
      { recurringId: 'r-loyer', date: '2026-09-05' },
      { recurringId: 'r-loyer', date: '2026-10-05' },
    ]);
  });

  it('annonce les prochaines échéances sur 30 jours', () => {
    expect(upcomingDue(recurring, '2026-11-23')).toEqual([
      { recurringId: 'r-net', date: '2026-11-28' },
      { recurringId: 'r-sal', date: '2026-12-01' },
      { recurringId: 'r-loyer', date: '2026-12-05' },
    ]);
  });
});

describe('reste à dépenser', () => {
  it('part de l’argent disponible et déduit les factures à venir ce mois-ci', () => {
    // Comptes : 165 000 (banque 168 000, espèces −3 000) ; reste la facture de 3 000 le 28.
    expect(remainingToSpend(accounts, txs, recurring, '2026-11-23')).toEqual({
      remainingCents: 165_000 - 3_000,
      daysLeft: 8,
      perDayCents: Math.floor(162_000 / 8),
    });
  });

  it('ne compte pas les comptes épargne', () => {
    const savings: MoneyAccount = {
      id: 'sav',
      name: 'Livret',
      kind: 'savings',
      openingCents: 50_000,
    };
    expect(
      remainingToSpend([...accounts, savings], txs, recurring, '2026-11-23').remainingCents,
    ).toBe(162_000);
  });

  it('dernier jour du mois, et rien à dépenser si le solde est négatif', () => {
    expect(remainingToSpend(accounts, txs, recurring, '2026-11-30')).toMatchObject({
      daysLeft: 1,
      remainingCents: 165_000,
    });
    const broke = [tx('b', 'expense', 500_000, '2026-11-02', { categoryId: 'courses' })];
    expect(remainingToSpend(accounts, broke, [], '2026-11-23')).toMatchObject({
      remainingCents: 105_000 - 500_000,
      perDayCents: 0,
    });
  });
});

describe('épargne', () => {
  const goal = {
    id: 'g',
    targetCents: 100_000,
    deadline: '2027-03-10',
    accountId: null,
    savedCents: 20_000,
  };

  it('calcule ce qu’il faut mettre de côté chaque mois', () => {
    expect(goalProgress(goal, accounts, txs, '2026-11-23')).toEqual({
      savedCents: 20_000,
      ratio: 0.2,
      monthlyNeededCents: 20_000,
      reached: false,
    });
  });

  it('suit le solde d’un compte lié, et sait quand c’est atteint', () => {
    expect(
      goalProgress({ ...goal, accountId: 'cash' }, accounts, txs, '2026-11-23').savedCents,
    ).toBe(0);
    const done = goalProgress({ ...goal, savedCents: 120_000 }, accounts, txs, '2026-11-23');
    expect(done).toMatchObject({ reached: true, monthlyNeededCents: null });
    expect(
      goalProgress({ ...goal, deadline: null }, accounts, txs, '2026-11-23').monthlyNeededCents,
    ).toBeNull();
    expect(
      goalProgress({ ...goal, deadline: '2026-11-30' }, accounts, txs, '2026-11-23')
        .monthlyNeededCents,
    ).toBe(80_000);
  });
});

describe('bilans', () => {
  it('trace les derniers mois avec le taux d’épargne', () => {
    expect(monthHistory(txs, '2026-11', 3)).toEqual([
      { month: '2026-09', incomeCents: 0, expenseCents: 0, savingsRate: null },
      { month: '2026-10', incomeCents: 0, expenseCents: 20_000, savingsRate: null },
      {
        month: '2026-11',
        incomeCents: 150_000,
        expenseCents: 70_000,
        savingsRate: 80_000 / 150_000,
      },
    ]);
  });

  it('classe les catégories et compare au mois précédent', () => {
    expect(topCategories(categories, txs, '2026-11')).toEqual([
      { categoryId: 'loyer', cents: 45_000, previousCents: 0, change: null },
      { categoryId: 'courses', cents: 25_000, previousCents: 20_000, change: 0.25 },
    ]);
  });
});
