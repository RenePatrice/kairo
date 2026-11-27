import { describe, expect, it } from 'vitest';
import type { MoneyTransaction } from './budget';
import { activeMonths, filterTransactions, groupByDay, searchKey } from './budgetList';

type Tx = MoneyTransaction & { note: string };
const tx = (id: string, over: Partial<Tx>): Tx => ({
  id,
  kind: 'expense',
  amountCents: 1_000,
  date: '2026-11-23',
  accountId: 'bank',
  toAccountId: null,
  categoryId: 'courses',
  recurringId: null,
  note: '',
  ...over,
});

const txs: Tx[] = [
  tx('a', { note: 'Épicerie du coin', amountCents: 2_500 }),
  tx('b', { kind: 'income', categoryId: 'salaire', amountCents: 150_000 }),
  tx('c', { date: '2026-11-20', categoryId: 'transport', accountId: 'cash', note: 'Taxi' }),
  tx('d', {
    date: '2026-11-20',
    kind: 'transfer',
    categoryId: null,
    toAccountId: 'cash',
    amountCents: 5_000,
  }),
  tx('e', { date: '2026-10-02', note: 'Marché' }),
];

describe('filterTransactions', () => {
  it('filtre par mois, catégorie et compte (virements compris)', () => {
    expect(filterTransactions(txs, { month: '2026-11' }).map((t) => t.id)).toEqual([
      'a',
      'b',
      'c',
      'd',
    ]);
    expect(filterTransactions(txs, { categoryId: 'courses' }).map((t) => t.id)).toEqual(['a', 'e']);
    expect(filterTransactions(txs, { accountId: 'cash' }).map((t) => t.id)).toEqual(['c', 'd']);
    expect(filterTransactions(txs, {})).toHaveLength(5);
  });

  it('cherche sans accents, dans la note et les noms', () => {
    expect(filterTransactions(txs, { query: 'epicerie' }).map((t) => t.id)).toEqual(['a']);
    expect(filterTransactions(txs, { query: ' TAXI ' }).map((t) => t.id)).toEqual(['c']);
    const names: Record<string, string> = { salaire: 'Salaire' };
    expect(
      filterTransactions(txs, { query: 'salaire' }, (t) => names[t.categoryId ?? ''] ?? '').map(
        (t) => t.id,
      ),
    ).toEqual(['b']);
  });

  it('normalise les mots cherchés', () => {
    expect(searchKey('  Épicerie Été ')).toBe('epicerie ete');
  });
});

describe('groupByDay', () => {
  it('regroupe par jour, du plus récent, avec le net du jour', () => {
    const groups = groupByDay(txs);
    expect(groups.map((g) => [g.date, g.items.map((t) => t.id), g.netCents])).toEqual([
      ['2026-11-23', ['a', 'b'], 150_000 - 2_500],
      ['2026-11-20', ['c', 'd'], -1_000],
      ['2026-10-02', ['e'], -1_000],
    ]);
  });
});

describe('activeMonths', () => {
  it('liste les mois avec des opérations, mois courant compris', () => {
    expect(activeMonths(txs, '2026-12')).toEqual(['2026-12', '2026-11', '2026-10']);
    expect(activeMonths([], '2026-12')).toEqual(['2026-12']);
  });
});
