/**
 * Liste des opérations du Budget : filtres (mois, catégorie, compte, recherche) et regroupement
 * par jour, avec le total de chaque jour.
 */
import type { MoneyTransaction, MonthKey } from './budget';
import type { DateKey } from './dates';

export interface TransactionFilter {
  month?: MonthKey | null;
  categoryId?: string | null;
  /** Un compte : ses opérations, virements entrants et sortants compris. */
  accountId?: string | null;
  /** Recherche dans la note et dans les noms (catégorie, comptes), sans tenir compte des accents. */
  query?: string;
}

/** Minuscules sans accents, pour une recherche tolérante (« epicerie » trouve « Épicerie »). */
export function searchKey(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

export function filterTransactions<T extends MoneyTransaction & { note: string }>(
  txs: readonly T[],
  filter: TransactionFilter,
  nameOf: (t: T) => string = () => '',
): T[] {
  const q = searchKey(filter.query ?? '');
  return txs.filter(
    (t) =>
      (!filter.month || t.date.startsWith(filter.month)) &&
      (!filter.categoryId || t.categoryId === filter.categoryId) &&
      (!filter.accountId ||
        t.accountId === filter.accountId ||
        t.toAccountId === filter.accountId) &&
      (!q || searchKey(`${t.note} ${nameOf(t)}`).includes(q)),
  );
}

export interface DayGroup<T> {
  date: DateKey;
  items: T[];
  /** Revenus − dépenses du jour (les virements ne comptent pas). */
  netCents: number;
}

/** Regroupe par jour, du plus récent au plus ancien ; l'ordre des opérations est conservé. */
export function groupByDay<T extends MoneyTransaction>(txs: readonly T[]): DayGroup<T>[] {
  const map = new Map<DateKey, T[]>();
  for (const t of txs) map.set(t.date, [...(map.get(t.date) ?? []), t]);
  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, items]) => ({
      date,
      items,
      netCents: items.reduce(
        (sum, t) =>
          sum + (t.kind === 'income' ? t.amountCents : t.kind === 'expense' ? -t.amountCents : 0),
        0,
      ),
    }));
}

/** Mois où il y a au moins une opération, du plus récent au plus ancien (plus le mois courant). */
export function activeMonths(txs: readonly MoneyTransaction[], current: MonthKey): MonthKey[] {
  return [...new Set([current, ...txs.map((t) => t.date.slice(0, 7))])].sort().reverse();
}
