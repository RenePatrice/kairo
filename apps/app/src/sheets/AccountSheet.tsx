import { parseSignedAmount } from '@kairo/core';
import { accountKinds, deleteMoney, saveAccount, useDb } from '@kairo/db';
import { Button, Field, FieldLabel, Pressable, Sheet } from '@kairo/ui';
import { useTranslation } from 'react-i18next';
import { useUi } from '../store';

/** Fiche « Nouveau compte » / « Modifier le compte » du Budget. */
export function AccountSheet() {
  const { t } = useTranslation('app');
  const db = useDb();
  const open = useUi((s) => s.sheet === 'account');
  const form = useUi((s) => s.accountForm);
  const patch = useUi((s) => s.patchAccount);
  const close = useUi((s) => s.closeSheet);
  const flash = useUi((s) => s.flash);
  if (!form) return null;

  const save = async () => {
    const name = form.name.trim();
    if (!name) return flash(t('budget.account.needName'));
    const openingCents = parseSignedAmount(form.opening);
    if (openingCents === null) return flash(t('budget.setup.invalidAmount'));
    await saveAccount(db, { id: form.id, name, kind: form.kind, openingCents });
    close();
    flash(form.id ? t('budget.account.updated') : t('budget.account.saved'));
  };

  const remove = async () => {
    if (!form.id) return;
    const undo = await deleteMoney(db, 'accounts', form.id);
    close();
    flash(t('budget.account.deleted'), t('common.undo'), undo);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => (o ? null : close())}
      label={t('budget.account.dialog')}
      title={
        <>
          {form.id ? t('budget.account.titleEditA') : t('budget.account.titleNewA')}{' '}
          <em>{t('budget.account.titleB')}</em>
        </>
      }
    >
      <FieldLabel label={t('budget.account.name')}>
        <Field value={form.name} maxLength={40} onChange={(e) => patch({ name: e.target.value })} />
      </FieldLabel>
      <section className="flex flex-col gap-2" aria-label={t('budget.account.kind')}>
        <span className="label-mono">{t('budget.account.kind')}</span>
        <div className="flex flex-wrap gap-2">
          {accountKinds.map((k) => (
            <Pressable
              key={k}
              onClick={() => patch({ kind: k })}
              aria-pressed={form.kind === k}
              className={`h-11 rounded-pill border px-3.5 text-small font-semibold ${
                form.kind === k ? 'border-inv bg-inv text-inv-ink' : 'border-line bg-card text-ink'
              }`}
            >
              {t(`budget.accountKinds.${k}`)}
            </Pressable>
          ))}
        </div>
      </section>
      <FieldLabel label={t('budget.account.opening')}>
        <Field
          value={form.opening}
          inputMode="decimal"
          placeholder="0"
          onChange={(e) => patch({ opening: e.target.value })}
        />
      </FieldLabel>
      <p className="-mt-2 m-0 text-caption text-ink3">{t('budget.account.openingHint')}</p>
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
