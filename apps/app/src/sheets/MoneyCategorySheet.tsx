import { parseAmount } from '@kairo/core';
import { deleteMoney, saveMoneyCategory, useDb } from '@kairo/db';
import { Button, Field, FieldLabel, GlassSurface, Pressable, Sheet, inkFor } from '@kairo/ui';
import { useTranslation } from 'react-i18next';
import { Swatches } from '../components/Swatches';
import { useUi } from '../store';

/** Fiche « Nouvelle catégorie » / « Modifier la catégorie » du Budget (avec son enveloppe). */
export function MoneyCategorySheet() {
  const { t } = useTranslation('app');
  const db = useDb();
  const open = useUi((s) => s.sheet === 'moneyCategory');
  const form = useUi((s) => s.moneyCategoryForm);
  const patch = useUi((s) => s.patchMoneyCategory);
  const close = useUi((s) => s.closeSheet);
  const flash = useUi((s) => s.flash);
  if (!form) return null;

  const save = async () => {
    const name = form.name.trim();
    if (!name) return flash(t('budget.category.needName'));
    const limit = form.kind === 'expense' && form.limit.trim() ? parseAmount(form.limit) : null;
    if (form.kind === 'expense' && form.limit.trim() && limit === null) {
      return flash(t('budget.setup.invalidAmount'));
    }
    await saveMoneyCategory(db, {
      id: form.id,
      name,
      color: form.color,
      kind: form.kind,
      monthlyLimitCents: limit,
    });
    close();
    flash(form.id ? t('budget.category.updated') : t('budget.category.saved'));
  };

  const remove = async () => {
    if (!form.id) return;
    const undo = await deleteMoney(db, 'moneyCategories', form.id);
    close();
    flash(t('budget.category.deleted'), t('common.undo'), undo);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => (o ? null : close())}
      label={t('budget.category.dialog')}
      title={
        <>
          {form.id ? t('budget.category.titleEditA') : t('budget.category.titleNewA')}{' '}
          <em>{t('budget.category.titleB')}</em>
        </>
      }
    >
      <FieldLabel label={t('budget.category.name')}>
        <Field value={form.name} maxLength={40} onChange={(e) => patch({ name: e.target.value })} />
      </FieldLabel>
      <GlassSurface
        className="grid grid-cols-2 gap-1 rounded-row p-1"
        role="group"
        aria-label={t('budget.category.kind')}
      >
        {(['expense', 'income'] as const).map((k) => (
          <Pressable
            key={k}
            onClick={() => patch({ kind: k })}
            aria-pressed={form.kind === k}
            className={`h-11 rounded-step text-small font-semibold ${
              form.kind === k ? 'bg-inv text-inv-ink' : 'text-ink2'
            }`}
          >
            {t(`budget.kinds.${k}`)}
          </Pressable>
        ))}
      </GlassSurface>
      <Swatches value={form.color} onChange={(color) => patch({ color })} />
      {form.kind === 'expense' ? (
        <FieldLabel label={t('budget.category.limit')}>
          <Field
            value={form.limit}
            inputMode="decimal"
            placeholder={t('budget.category.limitPh')}
            onChange={(e) => patch({ limit: e.target.value })}
          />
        </FieldLabel>
      ) : null}
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
