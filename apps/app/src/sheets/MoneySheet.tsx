import { envelopeCrossings, envelopes, monthKeyOf, parseAmount } from '@kairo/core';
import {
  deleteMoney,
  saveRecurring,
  saveTransaction,
  useDb,
  type MoneyTransactionRow,
} from '@kairo/db';
import {
  Button,
  Field,
  FieldLabel,
  GlassSurface,
  Pressable,
  Sheet,
  SwitchRow,
  inkFor,
} from '@kairo/ui';
import { useTranslation } from 'react-i18next';
import { useBudget } from '../lib/budget';
import { useUi, type MoneyForm } from '../store';

const KINDS: MoneyForm['kind'][] = ['expense', 'income', 'transfer'];

/** Fiche « Nouvelle opération » / « Modifier l'opération » du Budget. */
export function MoneySheet() {
  const { t } = useTranslation('app');
  const db = useDb();
  const b = useBudget();
  const open = useUi((s) => s.sheet === 'money');
  const form = useUi((s) => s.moneyForm);
  const patch = useUi((s) => s.patchMoney);
  const close = useUi((s) => s.closeSheet);
  const flash = useUi((s) => s.flash);
  if (!form) return null;

  const transfer = form.kind === 'transfer';
  const categories = b.categories.filter(
    (c) => c.kind === (form.kind === 'income' ? 'income' : 'expense'),
  );
  const day = Number(form.date.slice(8, 10)) || 1;

  const pickKind = (kind: MoneyForm['kind']) =>
    patch({
      kind,
      categoryId: null,
      monthly: kind === 'transfer' ? false : form.monthly,
      toAccountId:
        kind === 'transfer'
          ? form.toAccountId && form.toAccountId !== form.accountId
            ? form.toAccountId
            : (b.accounts.find((a) => a.id !== form.accountId)?.id ?? null)
          : form.toAccountId,
    });

  const save = async () => {
    const amountCents = parseAmount(form.amount);
    if (!amountCents) return flash(t('budget.sheet.needAmount'));
    if (!form.accountId) return flash(t('budget.sheet.needAccounts'));
    if (transfer && (!form.toAccountId || form.toAccountId === form.accountId)) {
      return flash(t('budget.sheet.needAccounts'));
    }
    if (!transfer && !form.categoryId) return flash(t('budget.sheet.needCategory'));

    let recurringId = form.recurringId;
    if (form.monthly && !form.id && !transfer && form.categoryId && form.kind !== 'transfer') {
      const r = await saveRecurring(db, {
        kind: form.kind,
        amountCents,
        accountId: form.accountId,
        categoryId: form.categoryId,
        dayOfMonth: day,
        startDate: form.date,
        note: form.note,
        active: true,
      });
      recurringId = r.id;
    }
    const month = monthKeyOf(form.date);
    const before = envelopes(b.categories, b.transactions, month);
    const saved: MoneyTransactionRow = await saveTransaction(db, {
      id: form.id,
      kind: form.kind,
      amountCents,
      date: form.date,
      accountId: form.accountId,
      toAccountId: transfer ? form.toAccountId : null,
      categoryId: transfer ? null : form.categoryId,
      recurringId,
      note: form.note,
    });
    close();
    // Enveloppe qui vient de passer 80 % ou 100 % : on prévient tout de suite.
    const after = envelopes(
      b.categories,
      [...b.transactions.filter((x) => x.id !== saved.id), saved],
      month,
    );
    const [crossed] = envelopeCrossings(before, after);
    if (crossed) {
      const name = b.categoryOf(crossed.categoryId)?.name ?? '';
      flash(
        crossed.status === 'over'
          ? t('budget.sheet.alertOver', { name })
          : t('budget.sheet.alertWarn', { name, pct: Math.round(crossed.ratio * 100) }),
      );
    } else flash(form.id ? t('budget.sheet.updated') : t('budget.sheet.saved'));
  };

  const remove = async () => {
    if (!form.id) return;
    const undo = await deleteMoney(db, 'transactions', form.id);
    close();
    flash(t('budget.sheet.deleted'), t('common.undo'), undo);
  };

  const accountChips = (
    value: string | null,
    onPick: (id: string) => void,
    exclude?: string | null,
  ) => (
    <div className="flex flex-wrap gap-2">
      {b.accounts
        .filter((a) => a.id !== exclude)
        .map((a) => (
          <Pressable
            key={a.id}
            onClick={() => onPick(a.id)}
            aria-pressed={value === a.id}
            className={`h-11 rounded-pill border px-3.5 text-small font-semibold ${
              value === a.id ? 'border-inv bg-inv text-inv-ink' : 'border-line bg-card text-ink'
            }`}
          >
            {a.name}
          </Pressable>
        ))}
    </div>
  );

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => (o ? null : close())}
      label={t('budget.sheet.dialog')}
      title={
        <>
          {form.id ? t('budget.sheet.titleEditA') : t('budget.sheet.titleNewA')}{' '}
          <em>{t('budget.sheet.titleB')}</em>
        </>
      }
    >
      <GlassSurface
        className="grid grid-cols-3 gap-1 rounded-row p-1"
        role="group"
        aria-label={t('budget.sheet.dialog')}
      >
        {KINDS.map((k) => (
          <Pressable
            key={k}
            onClick={() => pickKind(k)}
            aria-pressed={form.kind === k}
            disabled={k === 'transfer' && b.accounts.length < 2}
            className={`h-11 rounded-step text-small font-semibold disabled:opacity-40 ${
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
          autoFocus={!form.id}
          placeholder="0,00"
          className="h-16 num text-display"
          onChange={(e) => patch({ amount: e.target.value })}
        />
      </FieldLabel>

      {transfer ? (
        <>
          <section className="flex flex-col gap-2" aria-label={t('budget.sheet.from')}>
            <span className="label-mono">{t('budget.sheet.from')}</span>
            {accountChips(form.accountId, (id) =>
              patch({
                accountId: id,
                toAccountId: form.toAccountId === id ? null : form.toAccountId,
              }),
            )}
          </section>
          <section className="flex flex-col gap-2" aria-label={t('budget.sheet.to')}>
            <span className="label-mono">{t('budget.sheet.to')}</span>
            {accountChips(form.toAccountId, (id) => patch({ toAccountId: id }), form.accountId)}
          </section>
        </>
      ) : (
        <>
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
              {accountChips(form.accountId, (id) => patch({ accountId: id }))}
            </section>
          ) : null}
        </>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <FieldLabel label={t('budget.sheet.date')}>
          <Field
            type="date"
            value={form.date}
            onChange={(e) => e.target.value && patch({ date: e.target.value })}
          />
        </FieldLabel>
        <FieldLabel label={t('budget.sheet.note')}>
          <Field
            value={form.note}
            maxLength={200}
            placeholder={t('budget.sheet.notePh')}
            onChange={(e) => patch({ note: e.target.value })}
          />
        </FieldLabel>
      </div>

      {!form.id && !transfer ? (
        <SwitchRow
          name={t('budget.sheet.monthly')}
          description={t('budget.sheet.monthlyDesc', { day })}
          checked={form.monthly}
          onChange={(monthly) => patch({ monthly })}
        />
      ) : null}

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
