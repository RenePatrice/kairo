import { parseAmount, parseSignedAmount } from '@kairo/core';
import { deleteMoney, saveSavingsGoal, useDb } from '@kairo/db';
import { Button, Field, FieldLabel, Pressable, Sheet, inkFor } from '@kairo/ui';
import { useTranslation } from 'react-i18next';
import { Swatches } from '../components/Swatches';
import { useBudget } from '../lib/budget';
import { useUi } from '../store';

/** Fiche « Nouvel objectif » / « Modifier l'objectif » d'épargne. */
export function SavingsGoalSheet() {
  const { t } = useTranslation('app');
  const db = useDb();
  const b = useBudget();
  const open = useUi((s) => s.sheet === 'savings');
  const form = useUi((s) => s.savingsForm);
  const patch = useUi((s) => s.patchSavings);
  const close = useUi((s) => s.closeSheet);
  const flash = useUi((s) => s.flash);
  if (!form) return null;

  const save = async () => {
    const name = form.name.trim();
    if (!name) return flash(t('budget.savings.needName'));
    const targetCents = parseAmount(form.target);
    if (!targetCents) return flash(t('budget.sheet.needAmount'));
    const saved = form.accountId ? 0 : parseSignedAmount(form.saved);
    if (saved === null || saved < 0) return flash(t('budget.setup.invalidAmount'));
    await saveSavingsGoal(db, {
      id: form.id,
      name,
      targetCents,
      deadline: form.deadline || null,
      accountId: form.accountId,
      savedCents: saved,
      color: form.color,
    });
    close();
    flash(form.id ? t('budget.savings.updated') : t('budget.savings.saved_toast'));
  };

  const remove = async () => {
    if (!form.id) return;
    const undo = await deleteMoney(db, 'savingsGoals', form.id);
    close();
    flash(t('budget.savings.deleted'), t('common.undo'), undo);
  };

  const accountChip = (id: string | null, label: string) => (
    <Pressable
      key={id ?? 'none'}
      onClick={() => patch({ accountId: id })}
      aria-pressed={form.accountId === id}
      className={`h-11 rounded-pill border px-3.5 text-small font-semibold ${
        form.accountId === id ? 'border-inv bg-inv text-inv-ink' : 'border-line bg-card text-ink'
      }`}
    >
      {label}
    </Pressable>
  );

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => (o ? null : close())}
      label={t('budget.savings.dialog')}
      title={
        <>
          {form.id ? t('budget.savings.titleEditA') : t('budget.savings.titleNewA')}{' '}
          <em>{t('budget.savings.titleB')}</em>
        </>
      }
    >
      <FieldLabel label={t('budget.savings.name')}>
        <Field
          value={form.name}
          maxLength={40}
          placeholder={t('budget.savings.namePh')}
          onChange={(e) => patch({ name: e.target.value })}
        />
      </FieldLabel>
      <div className="grid grid-cols-2 gap-2.5">
        <FieldLabel label={t('budget.savings.target')}>
          <Field
            value={form.target}
            inputMode="decimal"
            placeholder="0,00"
            onChange={(e) => patch({ target: e.target.value })}
          />
        </FieldLabel>
        <FieldLabel label={t('budget.savings.deadline')}>
          <Field
            type="date"
            value={form.deadline}
            onChange={(e) => patch({ deadline: e.target.value })}
          />
        </FieldLabel>
      </div>
      <section className="flex flex-col gap-2" aria-label={t('budget.savings.account')}>
        <span className="label-mono">{t('budget.savings.account')}</span>
        <div className="flex flex-wrap gap-2">
          {accountChip(null, t('budget.savings.noAccount'))}
          {b.accounts.map((a) => accountChip(a.id, a.name))}
        </div>
        <span className="text-caption text-ink3">{t('budget.savings.accountHint')}</span>
      </section>
      {form.accountId ? null : (
        <FieldLabel label={t('budget.savings.saved')}>
          <Field
            value={form.saved}
            inputMode="decimal"
            placeholder="0"
            onChange={(e) => patch({ saved: e.target.value })}
          />
        </FieldLabel>
      )}
      <Swatches value={form.color} onChange={(color) => patch({ color })} />
      <div className="flex gap-2.5">
        <Button
          className="h-14 flex-[2] text-input"
          style={{ background: form.color, color: inkFor(form.color) }}
          onClick={() => void save()}
        >
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
