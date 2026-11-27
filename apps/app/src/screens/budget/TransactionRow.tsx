import type { MoneyTransactionRow } from '@kairo/db';
import { GlassSurface, Icon, Pressable, inkFor, status } from '@kairo/ui';
import { useTranslation } from 'react-i18next';
import { useBudget } from '../../lib/budget';
import { useFormat } from '../../lib/format';

/** Une opération : catégorie (ou virement), note, date et montant signé. */
export function TransactionRow({
  tx,
  onOpen,
  showDate = true,
}: {
  tx: MoneyTransactionRow;
  onOpen: () => void;
  showDate?: boolean;
}) {
  const { t } = useTranslation('app');
  const f = useFormat();
  const { money, categoryOf, accountOf } = useBudget();
  const category = categoryOf(tx.categoryId);
  const transfer = tx.kind === 'transfer';
  const title = transfer
    ? t('budget.transferLabel', {
        from: accountOf(tx.accountId)?.name ?? '?',
        to: accountOf(tx.toAccountId)?.name ?? '?',
      })
    : (category?.name ?? '?');
  const d = new Date(`${tx.date}T12:00:00`);
  const sign = tx.kind === 'income' ? '+' : tx.kind === 'expense' ? '−' : '';

  return (
    <GlassSurface className="rounded-tile">
      <Pressable
        onClick={onOpen}
        className="flex w-full items-center gap-3 rounded-tile px-3.5 py-3 text-left"
      >
        <span
          aria-hidden="true"
          className="flex size-10 flex-none items-center justify-center rounded-icon font-bold"
          style={
            transfer
              ? { background: 'var(--k-track)', color: 'var(--k-ink2)' }
              : {
                  background: category?.color,
                  color: category ? inkFor(category.color) : undefined,
                }
          }
        >
          {transfer ? <Icon name="transfer" size={18} /> : (category?.name.charAt(0) ?? '?')}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-body font-semibold">{title}</span>
          <span className="truncate text-caption text-ink3">
            {[
              showDate ? `${d.getDate()} ${f.month(d.getMonth())}` : null,
              tx.note || null,
              tx.recurringId ? '↻' : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </span>
        <span
          className="num text-input"
          style={{
            color: tx.kind === 'income' ? status.success : transfer ? 'var(--k-ink2)' : undefined,
          }}
        >
          {sign}
          {money(tx.amountCents)}
        </span>
      </Pressable>
    </GlassSurface>
  );
}
