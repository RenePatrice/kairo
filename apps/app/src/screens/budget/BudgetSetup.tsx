import { parseAmount } from '@kairo/core';
import { setupBudget, useDb, type AccountInput } from '@kairo/db';
import { Button, Field, FieldLabel, GlassSurface, Pressable, inkFor } from '@kairo/ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CURRENCIES, defaultMoneyCategories, suggestedCurrency } from '../../lib/budget';
import { useUi } from '../../store';

/** Montant facultatif : vide = 0, illisible = null. */
const optionalAmount = (text: string): number | null => (text.trim() ? parseAmount(text) : 0);

/** Première ouverture du Budget : devise, compte principal, espèces, catégories de départ. */
export function BudgetSetup() {
  const { t } = useTranslation('app');
  const db = useDb();
  const go = useUi((s) => s.go);
  const flash = useUi((s) => s.flash);
  const suggested = suggestedCurrency(navigator.languages ?? [navigator.language]);
  const [currency, setCurrency] = useState(suggested);
  const [accountName, setAccountName] = useState(t('budget.setup.accountDefault'));
  const [opening, setOpening] = useState('');
  const [cash, setCash] = useState('');
  const defaults = defaultMoneyCategories(t);
  const [chosen, setChosen] = useState(() => new Set(defaults.map((c) => c.name)));
  const currencies = [suggested, ...CURRENCIES.filter((c) => c !== suggested)];

  const start = async () => {
    const openingCents = optionalAmount(opening);
    const cashCents = optionalAmount(cash);
    if (openingCents === null || cashCents === null) return flash(t('budget.setup.invalidAmount'));
    const accounts: AccountInput[] = [
      { name: accountName.trim() || t('budget.setup.accountDefault'), kind: 'bank', openingCents },
    ];
    if (cashCents > 0) {
      accounts.push({ name: t('budget.setup.cashName'), kind: 'cash', openingCents: cashCents });
    }
    await setupBudget(db, {
      currency,
      accounts,
      categories: defaults.filter((c) => chosen.has(c.name)),
    });
    go('money');
  };

  return (
    <div className="mx-auto flex max-w-120 flex-col gap-5">
      <span className="eyebrow">{t('budget.setup.eyebrow')}</span>
      <h1 className="headline text-splash">
        {t('budget.setup.titleA')}
        <br />
        <em>{t('budget.setup.titleB')}</em>
      </h1>
      <p className="m-0 text-input leading-normal text-ink2">{t('budget.setup.intro')}</p>

      <section className="flex flex-col gap-2.5" aria-label={t('budget.setup.currency')}>
        <span className="label-mono">{t('budget.setup.currency')}</span>
        <div className="flex flex-wrap gap-2">
          {currencies.map((c) => (
            <Pressable
              key={c}
              onClick={() => setCurrency(c)}
              aria-pressed={currency === c}
              className={`h-11 rounded-pill border px-4 mono-num text-small font-semibold ${
                currency === c ? 'border-acc bg-acc text-acc-ink' : 'border-line bg-card text-ink'
              }`}
            >
              {c}
            </Pressable>
          ))}
        </div>
      </section>

      <FieldLabel label={t('budget.setup.account')}>
        <Field
          value={accountName}
          maxLength={40}
          onChange={(e) => setAccountName(e.target.value)}
        />
      </FieldLabel>
      <FieldLabel label={t('budget.setup.opening')}>
        <Field
          value={opening}
          inputMode="decimal"
          placeholder="0"
          onChange={(e) => setOpening(e.target.value)}
        />
      </FieldLabel>
      <FieldLabel label={t('budget.setup.cash')}>
        <Field
          value={cash}
          inputMode="decimal"
          placeholder="0"
          onChange={(e) => setCash(e.target.value)}
        />
      </FieldLabel>

      <GlassSurface className="flex flex-col gap-3 rounded-card p-4">
        <span className="label-mono">{t('budget.setup.categories')}</span>
        <div className="flex flex-wrap gap-2">
          {defaults.map((c) => {
            const on = chosen.has(c.name);
            return (
              <Pressable
                key={c.name}
                onClick={() =>
                  setChosen((prev) => {
                    const next = new Set(prev);
                    if (on) next.delete(c.name);
                    else next.add(c.name);
                    return next;
                  })
                }
                aria-pressed={on}
                className="h-11 rounded-pill border px-3.5 text-small font-semibold"
                style={{
                  background: on ? c.color : 'var(--k-card)',
                  color: on ? inkFor(c.color) : 'var(--k-ink2)',
                  borderColor: on ? c.color : 'var(--k-line)',
                }}
              >
                {c.name}
              </Pressable>
            );
          })}
        </div>
        <span className="text-caption text-ink3">{t('budget.setup.categoriesHint')}</span>
      </GlassSurface>

      <Button className="h-14.5 text-input" onClick={() => void start()}>
        {t('budget.setup.start')}
      </Button>
    </div>
  );
}
