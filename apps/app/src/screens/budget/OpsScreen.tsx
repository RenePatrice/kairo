import {
  activeMonths,
  dateKey,
  filterTransactions,
  groupByDay,
  isoWeekday,
  monthKeyOf,
  monthSummary,
  monthStart,
} from '@kairo/core';
import { Field, GlassSurface, Icon, Pressable, inkFor, status } from '@kairo/ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBudget, useMoneyActions } from '../../lib/budget';
import { useFormat } from '../../lib/format';
import { TransactionRow } from './TransactionRow';

/** Opérations : mois par mois, recherche, filtres par catégorie et compte, regroupées par jour. */
export function OpsScreen() {
  const { t } = useTranslation('app');
  const f = useFormat();
  const b = useBudget();
  const { editTransaction } = useMoneyActions();
  const [month, setMonth] = useState(() => monthKeyOf(dateKey(new Date())));
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  if (!b.ready) return null;

  const months = activeMonths(b.transactions, monthKeyOf(dateKey(new Date())));
  const index = months.indexOf(month);
  const nameOf = (tx: (typeof b.transactions)[number]) =>
    [
      b.categoryOf(tx.categoryId)?.name,
      b.accountOf(tx.accountId)?.name,
      b.accountOf(tx.toAccountId)?.name,
    ]
      .filter(Boolean)
      .join(' ');
  const list = filterTransactions(b.transactions, { month, categoryId, accountId, query }, nameOf);
  const groups = groupByDay(list);
  const summary = monthSummary(b.transactions, month);
  const start = monthStart(month);
  const signed = (cents: number) =>
    `${cents > 0 ? '+' : cents < 0 ? '−' : ''}${b.money(Math.abs(cents))}`;

  const chip = (on: boolean, label: string, onClick: () => void, color?: string) => (
    <Pressable
      key={label}
      onClick={onClick}
      aria-pressed={on}
      className="h-11 flex-none whitespace-nowrap rounded-pill border px-3.5 text-small font-semibold"
      style={
        color && on
          ? { background: color, color: inkFor(color), borderColor: color }
          : on
            ? { background: 'var(--k-inv)', color: 'var(--k-inv-ink)', borderColor: 'var(--k-inv)' }
            : { background: 'var(--k-card)', color: 'var(--k-ink)', borderColor: 'var(--k-line)' }
      }
    >
      {label}
    </Pressable>
  );

  return (
    <div className="flex flex-col gap-4 desktop:mx-auto desktop:max-w-160">
      <h1 className="headline text-hero">
        {t('budget.ops.titleA')} <em>{t('budget.ops.titleB')}</em>.
      </h1>

      <GlassSurface className="flex items-center gap-2 rounded-card p-2">
        <Pressable
          onClick={() => setMonth(months[index + 1] ?? month)}
          disabled={index >= months.length - 1}
          aria-label={t('budget.ops.prevMonth')}
          className="flex size-11 items-center justify-center rounded-pill disabled:opacity-30"
        >
          <Icon name="chevronLeft" size={18} />
        </Pressable>
        <span className="flex flex-1 flex-col items-center">
          <span className="text-body font-semibold">
            {f.month(start.getMonth())} {start.getFullYear()}
          </span>
          <span className="mono-num text-caption text-ink3">
            <span style={{ color: status.success }}>+{b.money(summary.incomeCents)}</span> · −
            {b.money(summary.expenseCents)}
          </span>
        </span>
        <Pressable
          onClick={() => setMonth(months[index - 1] ?? month)}
          disabled={index <= 0}
          aria-label={t('budget.ops.nextMonth')}
          className="flex size-11 items-center justify-center rounded-pill disabled:opacity-30"
        >
          <Icon name="chevronRight" size={18} />
        </Pressable>
      </GlassSurface>

      <Field
        type="search"
        value={query}
        aria-label={t('budget.ops.search')}
        placeholder={t('budget.ops.searchPh')}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div
        className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5"
        role="group"
        aria-label={t('budget.ops.filters')}
      >
        {chip(categoryId === null, t('budget.ops.all'), () => setCategoryId(null))}
        {b.categories.map((c) =>
          chip(
            categoryId === c.id,
            c.name,
            () => setCategoryId(categoryId === c.id ? null : c.id),
            c.color,
          ),
        )}
      </div>
      {b.accounts.length > 1 ? (
        <div
          className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5"
          role="group"
          aria-label={t('budget.ops.accountFilters')}
        >
          {chip(accountId === null, t('budget.ops.allAccounts'), () => setAccountId(null))}
          {b.accounts.map((a) =>
            chip(accountId === a.id, a.name, () => setAccountId(accountId === a.id ? null : a.id)),
          )}
        </div>
      ) : null}

      {groups.length ? (
        groups.map((g) => {
          const d = new Date(`${g.date}T12:00:00`);
          return (
            <section key={g.date} className="flex flex-col gap-2" aria-label={g.date}>
              <div className="flex items-baseline justify-between px-1">
                <span className="eyebrow">
                  {f.dayName(isoWeekday(d))} {d.getDate()} {f.month(d.getMonth())}
                </span>
                <span
                  className="mono-num text-caption"
                  style={{ color: g.netCents > 0 ? status.success : 'var(--k-ink2)' }}
                >
                  {signed(g.netCents)}
                </span>
              </div>
              {g.items.map((tx) => (
                <TransactionRow
                  key={tx.id}
                  tx={tx}
                  showDate={false}
                  onOpen={() => editTransaction(tx)}
                />
              ))}
            </section>
          );
        })
      ) : (
        <GlassSurface className="rounded-card p-4 text-body text-ink2">
          {t('budget.ops.empty')}
        </GlassSurface>
      )}
    </div>
  );
}
