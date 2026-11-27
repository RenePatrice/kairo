import { dateKey, envelopes, monthKeyOf, monthSummary } from '@kairo/core';
import { Button, GlassSurface, Pressable, activityPalette, status, withAlpha } from '@kairo/ui';
import { useTranslation } from 'react-i18next';
import { amountInput, useBudget } from '../../lib/budget';
import { useFormat } from '../../lib/format';
import { useUi } from '../../store';
import type { MoneyCategoryRow, MoneyRecurringRow } from '@kairo/db';

const STATUS_STYLE = {
  ok: { bg: withAlpha(status.success, 0.18), fg: status.success },
  warn: { bg: withAlpha(status.warning, 0.2), fg: status.warning },
  over: { bg: withAlpha(status.danger, 0.18), fg: status.danger },
} as const;

/** Enveloppes : plafond mensuel par catégorie, et factures / revenus récurrents. */
export function EnvelopesScreen() {
  const { t } = useTranslation('app');
  const f = useFormat();
  const b = useBudget();
  const openCategory = useUi((s) => s.openMoneyCategory);
  const openRecurring = useUi((s) => s.openRecurring);
  if (!b.ready) return null;

  const today = dateKey(new Date());
  const month = monthKeyOf(today);
  const envs = envelopes(b.categories, b.transactions, month);
  const spentBy = monthSummary(b.transactions, month).byCategory;
  const budgeted = envs.reduce((s, e) => s + e.limitCents, 0);
  const spentInEnvelopes = envs.reduce((s, e) => s + e.spentCents, 0);
  const expense = b.categories.filter((c) => c.kind === 'expense');
  const income = b.categories.filter((c) => c.kind === 'income');

  const editCategory = (c: MoneyCategoryRow) =>
    openCategory({
      id: c.id,
      name: c.name,
      color: c.color,
      kind: c.kind,
      limit: c.monthlyLimitCents ? amountInput(c.monthlyLimitCents, f.locale) : '',
    });
  const newCategory = () =>
    openCategory({
      id: null,
      name: '',
      color: activityPalette[b.categories.length % activityPalette.length]?.hex ?? status.success,
      kind: 'expense',
      limit: '',
    });
  const editRecurring = (r: MoneyRecurringRow) =>
    openRecurring({
      id: r.id,
      kind: r.kind,
      amount: amountInput(r.amountCents, f.locale),
      categoryId: r.categoryId,
      accountId: r.accountId,
      dayOfMonth: r.dayOfMonth,
      startDate: r.startDate,
      note: r.note,
      active: r.active,
    });
  const newRecurring = () =>
    openRecurring({
      id: null,
      kind: 'expense',
      amount: '',
      categoryId: null,
      accountId: b.accounts[0]?.id ?? null,
      dayOfMonth: Number(today.slice(8, 10)),
      startDate: today,
      note: '',
      active: true,
    });

  return (
    <div className="flex flex-col gap-4 desktop:mx-auto desktop:max-w-160">
      <h1 className="headline text-hero">
        {t('budget.envelopes.titleA')} <em>{t('budget.envelopes.titleB')}</em>.
      </h1>
      {budgeted ? (
        <p className="m-0 mono-num text-small text-ink2">
          {t('budget.envelopes.summary', {
            spent: b.money(spentInEnvelopes),
            budgeted: b.money(budgeted),
          })}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        {expense.map((c) => {
          const env = envs.find((e) => e.categoryId === c.id);
          const style = env ? STATUS_STYLE[env.status] : null;
          return (
            <GlassSurface key={c.id} className="rounded-tile">
              <Pressable
                onClick={() => editCategory(c)}
                className="flex w-full flex-col gap-2 rounded-tile p-3.5 text-left"
              >
                <span className="flex items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className="size-2.5 rounded-pill"
                    style={{ background: c.color }}
                  />
                  <span className="flex-1 text-body font-semibold">{c.name}</span>
                  {env && style ? (
                    <span
                      className="rounded-block px-1.75 py-0.75 mono-num text-micro font-semibold"
                      style={{ background: style.bg, color: style.fg }}
                    >
                      {t(`budget.envelopes.status.${env.status}`)}
                    </span>
                  ) : null}
                </span>
                {env ? (
                  <>
                    <span className="h-2.5 overflow-hidden rounded-xs bg-track">
                      <span
                        className="block h-full rounded-xs"
                        style={{
                          width: `${Math.min(100, env.ratio * 100)}%`,
                          background: env.status === 'ok' ? c.color : style?.fg,
                        }}
                      />
                    </span>
                    <span className="flex justify-between mono-num text-caption text-ink2">
                      <span>
                        {b.money(env.spentCents)} / {b.money(env.limitCents)}
                      </span>
                      <span>
                        {env.leftCents >= 0
                          ? t('budget.home.left', { amount: b.money(env.leftCents) })
                          : t('budget.home.over', { amount: b.money(-env.leftCents) })}
                      </span>
                    </span>
                  </>
                ) : (
                  <span className="mono-num text-caption text-ink3">
                    {t('budget.envelopes.noLimit')} ·{' '}
                    {t('budget.envelopes.spent', { amount: b.money(spentBy[c.id] ?? 0) })}
                  </span>
                )}
              </Pressable>
            </GlassSurface>
          );
        })}
      </div>

      {income.length ? (
        <section className="flex flex-col gap-2" aria-label={t('budget.envelopes.income')}>
          <span className="eyebrow">{t('budget.envelopes.income')}</span>
          <div className="flex flex-wrap gap-2">
            {income.map((c) => (
              <GlassSurface key={c.id} className="rounded-pill">
                <Pressable
                  onClick={() => editCategory(c)}
                  className="flex h-11 items-center gap-2 rounded-pill px-3.5 text-small font-semibold"
                >
                  <span
                    aria-hidden="true"
                    className="size-2.5 rounded-pill"
                    style={{ background: c.color }}
                  />
                  {c.name}
                  <span className="mono-num text-caption text-ink3">
                    +{b.money(spentBy[c.id] ?? 0)}
                  </span>
                </Pressable>
              </GlassSurface>
            ))}
          </div>
        </section>
      ) : null}
      <Button variant="ghost" size="sm" onClick={newCategory}>
        {t('budget.envelopes.addCategory')}
      </Button>

      <section className="flex flex-col gap-2" aria-label={t('budget.envelopes.recurringTitle')}>
        <span className="eyebrow">{t('budget.envelopes.recurringTitle')}</span>
        {b.recurrings.length ? (
          b.recurrings.map((r) => (
            <GlassSurface key={r.id} className={`rounded-tile ${r.active ? '' : 'opacity-60'}`}>
              <Pressable
                onClick={() => editRecurring(r)}
                className="flex w-full items-center gap-3 rounded-tile px-3.5 py-3 text-left"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-body font-semibold">
                    {r.note || b.categoryOf(r.categoryId)?.name}
                  </span>
                  <span className="truncate text-caption text-ink3">
                    {t('budget.envelopes.everyMonth', {
                      day: r.dayOfMonth,
                      account: b.accountOf(r.accountId)?.name ?? '?',
                    })}
                    {r.active ? '' : ` · ${t('budget.envelopes.paused')}`}
                  </span>
                </span>
                <span
                  className="num text-input"
                  style={{ color: r.kind === 'income' ? status.success : undefined }}
                >
                  {r.kind === 'income' ? '+' : '−'}
                  {b.money(r.amountCents)}
                </span>
              </Pressable>
            </GlassSurface>
          ))
        ) : (
          <GlassSurface className="rounded-card p-4 text-body leading-normal text-ink2">
            {t('budget.envelopes.recurringEmpty')}
          </GlassSurface>
        )}
        <Button variant="ghost" size="sm" onClick={newRecurring}>
          {t('budget.envelopes.addRecurring')}
        </Button>
      </section>
    </div>
  );
}
