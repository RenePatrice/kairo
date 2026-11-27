import { dateKey, goalProgress } from '@kairo/core';
import type { SavingsGoalRow } from '@kairo/db';
import { Button, GlassSurface, Pressable, activityPalette, status, withAlpha } from '@kairo/ui';
import { useTranslation } from 'react-i18next';
import { amountInput, useBudget } from '../../lib/budget';
import { useFormat } from '../../lib/format';
import { useUi } from '../../store';

/** Section « Objectifs d'épargne » de l'Aperçu : jauge, mensualité nécessaire, + Objectif. */
export function SavingsGoals() {
  const { t } = useTranslation('app');
  const f = useFormat();
  const b = useBudget();
  const openSavings = useUi((s) => s.openSavings);
  const today = dateKey(new Date());

  const edit = (g: SavingsGoalRow) =>
    openSavings({
      id: g.id,
      name: g.name,
      target: amountInput(g.targetCents, f.locale),
      deadline: g.deadline ?? '',
      accountId: g.accountId,
      saved: g.savedCents ? amountInput(g.savedCents, f.locale) : '',
      color: g.color,
    });
  const create = () =>
    openSavings({
      id: null,
      name: '',
      target: '',
      deadline: '',
      accountId: null,
      saved: '',
      color: activityPalette[(b.goals.length + 2) % activityPalette.length]?.hex ?? status.success,
    });

  return (
    <section className="flex flex-col gap-2" aria-label={t('budget.savings.title')}>
      <span className="eyebrow">{t('budget.savings.title')}</span>
      {b.goals.map((g) => {
        const p = goalProgress(g, b.accounts, b.transactions, today);
        const deadline = g.deadline ? new Date(`${g.deadline}T12:00:00`) : null;
        return (
          <GlassSurface key={g.id} className="rounded-tile">
            <Pressable
              onClick={() => edit(g)}
              className="flex w-full flex-col gap-2 rounded-tile p-3.5 text-left"
            >
              <span className="flex items-baseline gap-2">
                <span className="flex-1 text-body font-semibold">{g.name}</span>
                <span className="mono-num text-caption text-ink2">
                  {b.money(p.savedCents)} / {b.money(g.targetCents)}
                </span>
              </span>
              <span className="h-2.5 overflow-hidden rounded-xs bg-track">
                <span
                  className="block h-full rounded-xs"
                  style={{
                    width: `${Math.min(100, p.ratio * 100)}%`,
                    background: g.color,
                    boxShadow: `0 0 10px ${withAlpha(g.color, 0.5)}`,
                  }}
                />
              </span>
              <span className="text-caption text-ink3">
                {p.reached
                  ? t('budget.savings.reached')
                  : p.monthlyNeededCents !== null && deadline
                    ? t('budget.savings.perMonth', {
                        amount: b.money(p.monthlyNeededCents),
                        date: `${deadline.getDate()} ${f.month(deadline.getMonth())} ${deadline.getFullYear()}`,
                      })
                    : t('budget.savings.percent', { pct: Math.round(p.ratio * 100) })}
              </span>
            </Pressable>
          </GlassSurface>
        );
      })}
      <Button variant="ghost" size="sm" onClick={create}>
        {t('budget.savings.add')}
      </Button>
    </section>
  );
}
