import {
  accountBalance,
  dateKey,
  envelopes,
  monthKeyOf,
  monthSummary,
  remainingToSpend,
  totalBalance,
  upcomingDue,
} from '@kairo/core';
import { Button, GlassSurface, Pressable, status, withAlpha } from '@kairo/ui';
import { useTranslation } from 'react-i18next';
import { amountInput, useBudget, useMoneyActions } from '../../lib/budget';
import { useFormat } from '../../lib/format';
import { useNow } from '../../lib/useNow';
import { useUi } from '../../store';
import { SavingsGoals } from './SavingsGoals';
import { TransactionRow } from './TransactionRow';

const RECENT = 5;
const UPCOMING = 4;

/** Aperçu du Budget : reste à dépenser, comptes, enveloppes, échéances, dernières opérations. */
export function BudgetHome() {
  const { t } = useTranslation('app');
  const f = useFormat();
  const now = useNow(60_000);
  const go = useUi((s) => s.go);
  const openAccount = useUi((s) => s.openAccount);
  const b = useBudget();
  const { editTransaction } = useMoneyActions();
  if (!b.ready) return null;

  const today = dateKey(now);
  const month = monthKeyOf(today);
  const summary = monthSummary(b.transactions, month);
  const left = remainingToSpend(b.accounts, b.transactions, b.recurrings, today);
  const envs = envelopes(b.categories, b.transactions, month);
  const due = upcomingDue(b.recurrings, today).slice(0, UPCOMING);

  return (
    <div className="flex flex-col gap-4 desktop:mx-auto desktop:max-w-160">
      <span className="eyebrow">
        {f.month(now.getMonth())} {now.getFullYear()}
      </span>
      <h1 className="headline text-hero">
        {t('budget.home.titleA')} <em>{t('budget.home.titleB')}</em>.
      </h1>

      <div className="relative rounded-panel p-[1.5px]">
        <span
          aria-hidden="true"
          className="absolute inset-0 animate-spin-iri rounded-panel iridescent opacity-60"
        />
        <div className="relative flex flex-col gap-2 rounded-[29px] bg-bg2 p-5">
          <span className="eyebrow">{t('budget.home.remaining')}</span>
          <span
            className="num text-numeral"
            style={{ color: left.remainingCents < 0 ? status.danger : undefined }}
          >
            {b.money(left.remainingCents)}
          </span>
          <span className="text-small text-ink2">
            {left.perDayCents > 0
              ? t('budget.home.perDay', { amount: b.money(left.perDayCents), days: left.daysLeft })
              : t('budget.home.nothingLeft')}
          </span>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <span className="flex flex-col">
              <span className="label-mono">{t('budget.home.income')}</span>
              <span className="num text-input" style={{ color: status.success }}>
                +{b.money(summary.incomeCents)}
              </span>
            </span>
            <span className="flex flex-col">
              <span className="label-mono">{t('budget.home.expense')}</span>
              <span className="num text-input">−{b.money(summary.expenseCents)}</span>
            </span>
          </div>
        </div>
      </div>

      <GlassSurface className="flex flex-col gap-3 rounded-card p-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className="eyebrow">{t('budget.home.accounts')}</span>
          <span className="mono-num text-caption text-ink2">
            {t('budget.home.total', { amount: b.money(totalBalance(b.accounts, b.transactions)) })}
          </span>
        </div>
        {b.accounts.map((a) => {
          const balance = accountBalance(a, b.transactions);
          return (
            <Pressable
              key={a.id}
              onClick={() =>
                openAccount({
                  id: a.id,
                  name: a.name,
                  kind: a.kind,
                  opening: amountInput(a.openingCents, f.locale),
                })
              }
              className="-mx-2 flex items-center gap-3 rounded-field px-2 py-1 text-left"
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-body font-semibold">{a.name}</span>
                <span className="text-caption text-ink3">{t(`budget.accountKinds.${a.kind}`)}</span>
              </span>
              <span
                className="num text-input"
                style={{ color: balance < 0 ? status.danger : undefined }}
              >
                {b.money(balance)}
              </span>
            </Pressable>
          );
        })}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => openAccount({ id: null, name: '', kind: 'bank', opening: '' })}
        >
          {t('budget.account.add')}
        </Button>
      </GlassSurface>

      {envs.length ? (
        <GlassSurface className="flex flex-col gap-3 rounded-card p-4">
          <div className="flex items-baseline justify-between">
            <span className="eyebrow">{t('budget.home.envelopes')}</span>
            <button
              type="button"
              onClick={() => go('envelopes')}
              className="min-h-11 text-caption font-semibold text-acc-text"
            >
              {t('budget.home.seeAll')}
            </button>
          </div>
          {envs.slice(0, 4).map((e) => {
            const c = b.categoryOf(e.categoryId);
            const color =
              e.status === 'over'
                ? status.danger
                : e.status === 'warn'
                  ? status.warning
                  : (c?.color ?? status.success);
            return (
              <div key={e.categoryId} className="flex flex-col gap-1.5">
                <div className="flex justify-between text-chip">
                  <span className="font-semibold">{c?.name}</span>
                  <span className="mono-num text-caption text-ink2">
                    {e.leftCents >= 0
                      ? t('budget.home.left', { amount: b.money(e.leftCents) })
                      : t('budget.home.over', { amount: b.money(-e.leftCents) })}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-xs bg-track">
                  <span
                    className="block h-full rounded-xs"
                    style={{
                      width: `${Math.min(100, e.ratio * 100)}%`,
                      background: color,
                      boxShadow: `0 0 10px ${withAlpha(color, 0.5)}`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </GlassSurface>
      ) : null}

      {due.length ? (
        <GlassSurface className="flex flex-col gap-2.5 rounded-card p-4">
          <span className="eyebrow">{t('budget.home.upcoming')}</span>
          {due.map((d) => {
            const r = b.recurrings.find((x) => x.id === d.recurringId);
            if (!r) return null;
            const day = new Date(`${d.date}T12:00:00`);
            return (
              <div key={`${d.recurringId}-${d.date}`} className="flex items-center gap-3">
                <span className="w-14 mono-num text-caption text-ink3">
                  {day.getDate()} {f.month(day.getMonth())}
                </span>
                <span className="flex-1 truncate text-body">
                  {r.note || b.categoryOf(r.categoryId)?.name}
                </span>
                <span
                  className="num text-chip"
                  style={{ color: r.kind === 'income' ? status.success : undefined }}
                >
                  {r.kind === 'income' ? '+' : '−'}
                  {b.money(r.amountCents)}
                </span>
              </div>
            );
          })}
        </GlassSurface>
      ) : null}

      <SavingsGoals />

      <section className="flex flex-col gap-2" aria-label={t('budget.home.recent')}>
        <div className="flex items-baseline justify-between">
          <span className="eyebrow">{t('budget.home.recent')}</span>
          {b.transactions.length > RECENT ? (
            <button
              type="button"
              onClick={() => go('ops')}
              className="min-h-11 text-caption font-semibold text-acc-text"
            >
              {t('budget.home.seeAll')}
            </button>
          ) : null}
        </div>
        {b.transactions.length ? (
          b.transactions
            .slice(0, RECENT)
            .map((tx) => <TransactionRow key={tx.id} tx={tx} onOpen={() => editTransaction(tx)} />)
        ) : (
          <GlassSurface className="rounded-card p-4 text-body leading-normal text-ink2">
            {t('budget.home.empty')}
          </GlassSurface>
        )}
      </section>
    </div>
  );
}
