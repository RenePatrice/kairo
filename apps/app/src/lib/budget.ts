/**
 * Données et actions du Budget côté interface : lecture en direct, format des montants dans la
 * devise choisie, devise proposée d'après le téléphone, catégories de départ. Les calculs sont
 * dans @kairo/core (budget.ts).
 */
import { dateKey, type Cents } from '@kairo/core';
import {
  useAccounts,
  useMoneyCategories,
  useRecurrings,
  useSavingsGoals,
  useTransactions,
  type MoneyCategoryInput,
  type MoneyTransactionRow,
} from '@kairo/db';
import { activityPalette } from '@kairo/ui';
import type { TFunction } from 'i18next';
import { useCallback, useMemo } from 'react';
import { useUi, type MoneyForm } from '../store';
import { useAppData } from './data';
import { useFormat } from './format';

/** Devises proposées à la configuration (ISO 4217). */
export const CURRENCIES = [
  'EUR',
  'USD',
  'GBP',
  'CHF',
  'CAD',
  'MUR',
  'INR',
  'XOF',
  'XAF',
  'MAD',
  'TND',
  'DZD',
  'MGA',
] as const;

const REGION_CURRENCY: Record<string, string> = {
  US: 'USD',
  GB: 'GBP',
  CH: 'CHF',
  CA: 'CAD',
  MU: 'MUR',
  IN: 'INR',
  MA: 'MAD',
  TN: 'TND',
  DZ: 'DZD',
  MG: 'MGA',
  SN: 'XOF',
  CI: 'XOF',
  ML: 'XOF',
  BF: 'XOF',
  BJ: 'XOF',
  TG: 'XOF',
  NE: 'XOF',
  CM: 'XAF',
  GA: 'XAF',
  CG: 'XAF',
  TD: 'XAF',
  CF: 'XAF',
};

/** Devise probable d'après la langue du téléphone (« fr-MU » → MUR) ; l'euro sinon. */
export function suggestedCurrency(languages: readonly string[]): string {
  for (const lang of languages) {
    const region = lang.split('-')[1]?.toUpperCase();
    if (region && REGION_CURRENCY[region]) return REGION_CURRENCY[region];
  }
  return 'EUR';
}

const hex = (key: string) =>
  activityPalette.find((c) => c.key === key)?.hex ?? activityPalette[0].hex;

/** Catégories de départ, avec les noms dans la langue de l'app. */
export function defaultMoneyCategories(t: TFunction<'app'>): MoneyCategoryInput[] {
  const expense = (key: string, color: string): MoneyCategoryInput => ({
    name: t(`budget.defaults.${key}`),
    color: hex(color),
    kind: 'expense',
    monthlyLimitCents: null,
  });
  const income = (key: string, color: string): MoneyCategoryInput => ({
    name: t(`budget.defaults.${key}`),
    color: hex(color),
    kind: 'income',
    monthlyLimitCents: null,
  });
  return [
    expense('housing', 'lavande'),
    expense('groceries', 'menthe'),
    expense('transport', 'azur'),
    expense('health', 'corail'),
    expense('leisure', 'pivoine'),
    expense('subscriptions', 'glycine'),
    expense('family', 'miel'),
    expense('misc', 'ardoise'),
    income('salary', 'citron'),
    income('extras', 'sable'),
  ];
}

/** Toutes les données du Budget, en direct ; `ready` tant que tout n'est pas lu. */
export function useBudget() {
  const { settings } = useAppData();
  const f = useFormat();
  const accounts = useAccounts();
  const categories = useMoneyCategories();
  const transactions = useTransactions();
  const recurrings = useRecurrings();
  const goals = useSavingsGoals();
  const currency = settings.currency;

  const formatter = useMemo(
    () =>
      currency
        ? new Intl.NumberFormat(f.locale === 'en' ? 'en' : 'fr', { style: 'currency', currency })
        : null,
    [currency, f.locale],
  );
  /** « 12,50 € » ; montant en centimes. */
  const money = useCallback(
    (cents: Cents) => (formatter ? formatter.format(cents / 100) : (cents / 100).toFixed(2)),
    [formatter],
  );
  const categoryOf = useCallback(
    (id: string | null) => categories?.find((c) => c.id === id),
    [categories],
  );
  const accountOf = useCallback(
    (id: string | null) => accounts?.find((a) => a.id === id),
    [accounts],
  );

  return {
    ready: Boolean(accounts && categories && transactions && recurrings && goals),
    currency,
    accounts: accounts ?? [],
    categories: categories ?? [],
    transactions: transactions ?? [],
    recurrings: recurrings ?? [],
    goals: goals ?? [],
    money,
    categoryOf,
    accountOf,
  };
}

/** Montant affiché dans le champ de saisie (« 12,50 » en français). */
export function amountInput(cents: Cents, locale: 'fr' | 'en'): string {
  const s = (cents / 100).toFixed(2);
  return locale === 'fr' ? s.replace('.', ',') : s;
}

/** Ouverture de la fiche Opération (nouvelle ou existante). */
export function useMoneyActions() {
  const f = useFormat();
  const { accounts } = useBudget();
  const openMoney = useUi((s) => s.openMoney);

  const newTransaction = useCallback(
    (kind: MoneyForm['kind'] = 'expense') =>
      openMoney({
        id: null,
        kind,
        amount: '',
        categoryId: null,
        accountId: accounts[0]?.id ?? null,
        toAccountId: accounts[1]?.id ?? null,
        date: dateKey(new Date()),
        note: '',
        monthly: false,
        recurringId: null,
      }),
    [accounts, openMoney],
  );

  const editTransaction = useCallback(
    (t: MoneyTransactionRow) =>
      openMoney({
        id: t.id,
        kind: t.kind,
        amount: amountInput(t.amountCents, f.locale),
        categoryId: t.categoryId,
        accountId: t.accountId,
        toAccountId: t.toAccountId,
        date: t.date,
        note: t.note,
        monthly: false,
        recurringId: t.recurringId,
      }),
    [openMoney, f.locale],
  );

  return { newTransaction, editTransaction };
}
