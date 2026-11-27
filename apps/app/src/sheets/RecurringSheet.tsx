import { parseAmount } from '@kairo/core';
import { deleteMoney, saveRecurring, useDb } from '@kairo/db';
import {
  Button,
  Field,
  FieldLabel,
  GlassSurface,
  Pressable,
  Sheet,
  Stepper,
  SwitchRow,
  inkFor,
} from '@kairo/ui';
import { useTranslation } from 'react-i18next';
import { useBudget } from '../lib/budget';
import { useUi } from '../store';

/** Fiche « Nouvelle échéance » / « Modifier l'échéance » : facture ou revenu de chaque mois. */
export function RecurringSheet() {
  const { t } = useTranslation('app');
  const db = useDb();
  const b = useBudget();
  const open = useUi((s) => s.sheet === 'recurring');
  const form = useUi((s) => s.recurringForm);
  const patch = useUi((s) => s.patchRecurring);
  const close = useUi((s) => s.closeSheet);
  const flash = useUi((s) => s.flash);
  if (!form) return null;

  const categories = b.categories.filter((c) => c.kind === form.kind);

  const save = async () => {
    const amountCents = parseAmount(form.amount);
    if (!amountCents) return flash(t('budget.sheet.needAmount'));
    if (!form.categoryId) return flash(t('budget.sheet.needCategory'));
    if (!form.accountId) return flash(t('budget.sheet.needAccounts'));
    await saveRecurring(db, {
      id: form.id,
      kind: form.kind,
      amountCents,
      accountId: form.accountId,
      categoryId: form.categoryId,
      dayOfMonth: form.dayOfMonth,
      startDate: form.startDate,
      note: form.note,
      active: form.active,
    });
    close();
    flash(form.id ? t('budget.recurring.updated') : t('budget.recurring.saved'));
  };

  const remove = async () => {
    if (!form.id) return;
    const undo = await deleteMoney(db, 'recurrings', form.id);
    close();
    flash(t('budget.recurring.deleted'), t('common.undo'), undo);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => (o ? null : close())}
      label={t('budget.recurring.dialog')}
      title={
        <>
          {form.id ? t('budget.recurring.titleEditA') : t('budget.recurring.titleNewA')}{' '}
          <em>{t('budget.recurring.titleB')}</em>
        </>
      }
    >
      <GlassSurface
        className="grid grid-cols-2 gap-1 rounded-row p-1"
        role="group"
        aria-label={t('budget.recurring.dialog')}
      >
        {(['expense', 'income'] as const).map((k) => (
          <Pressable
            key={k}
            onClick={() => patch({ kind: k, categoryId: null })}
            aria-pressed={form.kind === k}
            className={`h-11 rounded-step text-small font-semibold ${
              form.kind === k ? 'bg-inv text-inv-ink' : 'text-ink2'
            }`}
          >
            {t(`budget.kinds.${k}`)}
          </Pressable>
        ))}
      </GlassSurface>
      <FieldLabel label={t('budget.sheet.amount')}>
        <Field
          value={form.amount}
          inputMode="decimal"
          placeholder="0,00"
          className="h-16 num text-display"
          onChange={(e) => patch({ amount: e.target.value })}
        />
      </FieldLabel>
      <section className="flex flex-col gap-2" aria-label={t('budget.sheet.category')}>
        <span className="label-mono">{t('budget.sheet.category')}</span>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const on = form.categoryId === c.id;
            return (
              <Pressable
                key={c.id}
                onClick={() => patch({ categoryId: c.id })}
                aria-pressed={on}
                className="h-11 rounded-pill border px-3.5 text-small font-semibold"
                style={{
                  background: on ? c.color : 'var(--k-card)',
                  color: on ? inkFor(c.color) : 'var(--k-ink)',
                  borderColor: on ? c.color : 'var(--k-line)',
                }}
              >
                {c.name}
              </Pressable>
            );
          })}
        </div>
      </section>
      {b.accounts.length > 1 ? (
        <section className="flex flex-col gap-2" aria-label={t('budget.sheet.account')}>
          <span className="label-mono">{t('budget.sheet.account')}</span>
          <div className="flex flex-wrap gap-2">
            {b.accounts.map((a) => (
              <Pressable
                key={a.id}
                onClick={() => patch({ accountId: a.id })}
                aria-pressed={form.accountId === a.id}
                className={`h-11 rounded-pill border px-3.5 text-small font-semibold ${
                  form.accountId === a.id
                    ? 'border-inv bg-inv text-inv-ink'
                    : 'border-line bg-card text-ink'
                }`}
              >
                {a.name}
              </Pressable>
            ))}
          </div>
        </section>
      ) : null}
      <GlassSurface className="flex items-center justify-between rounded-slot px-4 py-3">
        <span className="flex flex-col gap-0.5">
          <span className="label-mono">{t('budget.recurring.day')}</span>
          <span className="num text-title" aria-live="polite">
            {t('budget.recurring.dayValue', { day: form.dayOfMonth })}
          </span>
        </span>
        <span className="flex gap-2">
          <Stepper
            aria-label={t('budget.recurring.dayLess')}
            onClick={() => patch({ dayOfMonth: form.dayOfMonth <= 1 ? 31 : form.dayOfMonth - 1 })}
          >
            −
          </Stepper>
          <Stepper
            aria-label={t('budget.recurring.dayMore')}
            onClick={() => patch({ dayOfMonth: form.dayOfMonth >= 31 ? 1 : form.dayOfMonth + 1 })}
          >
            +
          </Stepper>
        </span>
      </GlassSurface>
      <FieldLabel label={t('budget.sheet.note')}>
        <Field
          value={form.note}
          maxLength={200}
          placeholder={t('budget.sheet.notePh')}
          onChange={(e) => patch({ note: e.target.value })}
        />
      </FieldLabel>
      <SwitchRow
        name={t('budget.recurring.active')}
        description={t('budget.recurring.activeDesc')}
        checked={form.active}
        onChange={(active) => patch({ active })}
      />
      <div className="flex gap-2.5">
        <Button className="h-14 flex-[2] text-input" onClick={() => void save()}>
          {t('common.save')}
        </Button>
        {form.id ? (
          <Button variant="danger" className="h-14 flex-1" onClick={() => void remove()}>
            {t('common.delete')}
          </Button>
        ) : null}
      </div>
    </Sheet>
  );
}
