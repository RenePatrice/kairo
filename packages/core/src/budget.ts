/**
 * Calculs du Budget : comptes et soldes, opérations du mois, enveloppes, reste à dépenser,
 * opérations récurrentes, objectifs d'épargne et bilans. Les montants sont des centimes
 * entiers (aucune erreur d'arrondi) ; le formatage avec la devise est fait par l'interface.
 */
import { addDays, dateKey, parseDateKey, type DateKey } from './dates';

/** Montant en centimes (entier). */
export type Cents = number;
/** Mois « AAAA-MM ». */
export type MonthKey = string;

export type AccountKind = 'bank' | 'cash' | 'mobile' | 'savings' | 'other';

export interface MoneyAccount {
  id: string;
  name: string;
  kind: AccountKind;
  /** Solde au moment où le compte a été ajouté. */
  openingCents: Cents;
}

export interface MoneyCategory {
  id: string;
  name: string;
  kind: 'expense' | 'income';
  /** Plafond mensuel de l'enveloppe (dépenses) ; `null` = pas d'enveloppe. */
  monthlyLimitCents: Cents | null;
}

export interface MoneyTransaction {
  id: string;
  kind: 'expense' | 'income' | 'transfer';
  /** Toujours positif ; le sens vient de `kind`. */
  amountCents: Cents;
  date: DateKey;
  accountId: string;
  /** Compte crédité d'un virement. */
  toAccountId: string | null;
  /** `null` pour un virement. */
  categoryId: string | null;
  /** Opération récurrente qui l'a créée. */
  recurringId: string | null;
}

export interface MoneyRecurring {
  id: string;
  kind: 'expense' | 'income';
  amountCents: Cents;
  accountId: string;
  categoryId: string;
  /** Jour du mois (1–31) ; ramené au dernier jour pour les mois plus courts. */
  dayOfMonth: number;
  /** Premier jour où elle s'applique. */
  startDate: DateKey;
  active: boolean;
}

export interface SavingsGoal {
  id: string;
  targetCents: Cents;
  /** Date visée, ou `null`. */
  deadline: DateKey | null;
  /** Compte dont le solde mesure l'épargne ; sinon `savedCents`. */
  accountId: string | null;
  savedCents: Cents;
}

// ---- Montants

const AMOUNT_RE = /^\s*(\d{1,9})(?:[.,](\d{1,2}))?\s*$/;

/** Lit « 12 », « 12,5 », « 12.50 » ou « 1 250,00 » en centimes ; `null` si illisible ou nul. */
export function parseAmount(input: string): Cents | null {
  const m = AMOUNT_RE.exec(input.replace(/[\s\u00a0\u202f]/g, ''));
  if (!m) return null;
  const cents = Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'));
  return cents > 0 ? cents : null;
}

// ---- Mois

export function monthKeyOf(date: Date | DateKey): MonthKey {
  return (typeof date === 'string' ? date : dateKey(date)).slice(0, 7);
}

export function monthStart(month: MonthKey): Date {
  const [y = 1970, m = 1] = month.split('-').map(Number);
  return new Date(y, m - 1, 1);
}

export function daysInMonth(month: MonthKey): number {
  const d = monthStart(month);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

export function addMonths(month: MonthKey, n: number): MonthKey {
  const d = monthStart(month);
  return monthKeyOf(new Date(d.getFullYear(), d.getMonth() + n, 1));
}

const inMonth = (t: { date: DateKey }, month: MonthKey) => t.date.startsWith(month);

// ---- Comptes

/** Solde d'un compte : solde de départ, revenus, dépenses et virements (jusqu'à `upTo` inclus). */
export function accountBalance(
  account: MoneyAccount,
  txs: readonly MoneyTransaction[],
  upTo?: DateKey,
): Cents {
  let total = account.openingCents;
  for (const t of txs) {
    if (upTo && t.date > upTo) continue;
    if (t.kind === 'income' && t.accountId === account.id) total += t.amountCents;
    if (t.kind === 'expense' && t.accountId === account.id) total -= t.amountCents;
    if (t.kind === 'transfer') {
      if (t.accountId === account.id) total -= t.amountCents;
      if (t.toAccountId === account.id) total += t.amountCents;
    }
  }
  return total;
}

/** Solde total de tous les comptes (les virements s'annulent). */
export function totalBalance(
  accounts: readonly MoneyAccount[],
  txs: readonly MoneyTransaction[],
  upTo?: DateKey,
): Cents {
  return accounts.reduce((sum, a) => sum + accountBalance(a, txs, upTo), 0);
}

// ---- Mois en cours

export interface MonthSummary {
  incomeCents: Cents;
  expenseCents: Cents;
  netCents: Cents;
  /** Dépenses (ou revenus) par catégorie. */
  byCategory: Record<string, Cents>;
}

/** Revenus, dépenses et solde du mois ; les virements ne comptent pas. */
export function monthSummary(txs: readonly MoneyTransaction[], month: MonthKey): MonthSummary {
  let incomeCents = 0;
  let expenseCents = 0;
  const byCategory: Record<string, Cents> = {};
  for (const t of txs) {
    if (!inMonth(t, month) || t.kind === 'transfer') continue;
    if (t.kind === 'income') incomeCents += t.amountCents;
    else expenseCents += t.amountCents;
    if (t.categoryId) byCategory[t.categoryId] = (byCategory[t.categoryId] ?? 0) + t.amountCents;
  }
  return { incomeCents, expenseCents, netCents: incomeCents - expenseCents, byCategory };
}

export type EnvelopeStatus = 'ok' | 'warn' | 'over';
export const ENVELOPE_WARN = 0.8;

export interface Envelope {
  categoryId: string;
  limitCents: Cents;
  spentCents: Cents;
  /** Reste dans l'enveloppe (négatif si dépassée). */
  leftCents: Cents;
  ratio: number;
  status: EnvelopeStatus;
}

export function envelopeStatus(ratio: number): EnvelopeStatus {
  return ratio >= 1 ? 'over' : ratio >= ENVELOPE_WARN ? 'warn' : 'ok';
}

/** Enveloppes du mois : plafond, dépensé, reste et état (alerte à 80 %, dépassement à 100 %). */
export function envelopes(
  categories: readonly MoneyCategory[],
  txs: readonly MoneyTransaction[],
  month: MonthKey,
): Envelope[] {
  const spent = monthSummary(txs, month).byCategory;
  return categories.flatMap((c) => {
    if (c.kind !== 'expense' || !c.monthlyLimitCents) return [];
    const spentCents = spent[c.id] ?? 0;
    const ratio = spentCents / c.monthlyLimitCents;
    return [
      {
        categoryId: c.id,
        limitCents: c.monthlyLimitCents,
        spentCents,
        leftCents: c.monthlyLimitCents - spentCents,
        ratio,
        status: envelopeStatus(ratio),
      },
    ];
  });
}

/** Enveloppes qui viennent de passer un seuil (80 % ou 100 %) : de quoi prévenir l'utilisateur. */
export function envelopeCrossings(
  before: readonly Envelope[],
  after: readonly Envelope[],
): Envelope[] {
  const rank = { ok: 0, warn: 1, over: 2 };
  return after.filter((e) => {
    const prev = before.find((b) => b.categoryId === e.categoryId);
    return rank[e.status] > rank[prev?.status ?? 'ok'];
  });
}

// ---- Récurrent

/** Date d'échéance d'une opération récurrente pour un mois donné (jour ramené à la fin du mois). */
export function dueDate(r: MoneyRecurring, month: MonthKey): DateKey {
  const day = Math.min(r.dayOfMonth, daysInMonth(month));
  return `${month}-${String(day).padStart(2, '0')}`;
}

export interface DueItem {
  recurringId: string;
  date: DateKey;
}

/** Échéances entre `from` et `to` (inclus), à partir de la date de début de chaque récurrence. */
export function dueBetween(
  recurring: readonly MoneyRecurring[],
  from: DateKey,
  to: DateKey,
): DueItem[] {
  const out: DueItem[] = [];
  for (const r of recurring) {
    if (!r.active) continue;
    for (let m = monthKeyOf(from); m <= monthKeyOf(to); m = addMonths(m, 1)) {
      const date = dueDate(r, m);
      if (date >= from && date <= to && date >= r.startDate) out.push({ recurringId: r.id, date });
    }
  }
  return out.sort(
    (a, b) => a.date.localeCompare(b.date) || a.recurringId.localeCompare(b.recurringId),
  );
}

/**
 * Échéances passées (jusqu'à aujourd'hui) pas encore enregistrées : l'app les ajoute toute seule.
 * On remonte au plus `lookbackMonths` mois.
 */
export function recurringToCreate(
  recurring: readonly MoneyRecurring[],
  txs: readonly MoneyTransaction[],
  today: DateKey,
  lookbackMonths = 12,
): DueItem[] {
  const done = new Set(txs.flatMap((t) => (t.recurringId ? [`${t.recurringId}|${t.date}`] : [])));
  const from = `${addMonths(monthKeyOf(today), -lookbackMonths)}-01`;
  return dueBetween(recurring, from, today).filter((d) => !done.has(`${d.recurringId}|${d.date}`));
}

/** Prochaines échéances (après aujourd'hui), sur `days` jours. */
export function upcomingDue(
  recurring: readonly MoneyRecurring[],
  today: DateKey,
  days = 30,
): DueItem[] {
  const from = dateKey(addDays(parseDateKey(today), 1));
  const to = dateKey(addDays(parseDateKey(today), days));
  return dueBetween(recurring, from, to);
}

// ---- Reste à dépenser

export interface Remaining {
  /** Revenus − dépenses du mois, échéances encore à venir ce mois-ci comprises. */
  remainingCents: Cents;
  /** Jours restants dans le mois, aujourd'hui compris. */
  daysLeft: number;
  /** Ce qu'on peut dépenser par jour jusqu'à la fin du mois (0 si plus rien). */
  perDayCents: Cents;
}

export function remainingToSpend(
  txs: readonly MoneyTransaction[],
  recurring: readonly MoneyRecurring[],
  today: DateKey,
): Remaining {
  const month = monthKeyOf(today);
  const s = monthSummary(txs, month);
  const end = `${month}-${String(daysInMonth(month)).padStart(2, '0')}`;
  const after = dateKey(addDays(parseDateKey(today), 1));
  let pending = 0;
  for (const d of after <= end ? dueBetween(recurring, after, end) : []) {
    const r = recurring.find((x) => x.id === d.recurringId);
    if (r) pending += r.kind === 'income' ? r.amountCents : -r.amountCents;
  }
  const remainingCents = s.netCents + pending;
  const daysLeft = daysInMonth(month) - Number(today.slice(8, 10)) + 1;
  return {
    remainingCents,
    daysLeft,
    perDayCents: remainingCents > 0 ? Math.floor(remainingCents / daysLeft) : 0,
  };
}

// ---- Épargne

export interface GoalProgress {
  savedCents: Cents;
  ratio: number;
  /** À mettre de côté chaque mois pour tenir la date (`null` sans date ou déjà atteint). */
  monthlyNeededCents: Cents | null;
  reached: boolean;
}

export function goalProgress(
  goal: SavingsGoal,
  accounts: readonly MoneyAccount[],
  txs: readonly MoneyTransaction[],
  today: DateKey,
): GoalProgress {
  const account = goal.accountId ? accounts.find((a) => a.id === goal.accountId) : undefined;
  const savedCents = account ? Math.max(0, accountBalance(account, txs)) : goal.savedCents;
  const reached = savedCents >= goal.targetCents;
  let monthlyNeededCents: Cents | null = null;
  if (goal.deadline && !reached) {
    const months = Math.max(
      1,
      (Number(goal.deadline.slice(0, 4)) - Number(today.slice(0, 4))) * 12 +
        (Number(goal.deadline.slice(5, 7)) - Number(today.slice(5, 7))),
    );
    monthlyNeededCents = Math.ceil((goal.targetCents - savedCents) / months);
  }
  return {
    savedCents,
    ratio: goal.targetCents ? savedCents / goal.targetCents : 0,
    monthlyNeededCents,
    reached,
  };
}

// ---- Bilans

export interface MonthPoint {
  month: MonthKey;
  incomeCents: Cents;
  expenseCents: Cents;
  /** Part des revenus épargnée (0..1), `null` sans revenu. */
  savingsRate: number | null;
}

/** Les `months` derniers mois, du plus ancien au mois `month` compris. */
export function monthHistory(
  txs: readonly MoneyTransaction[],
  month: MonthKey,
  months = 6,
): MonthPoint[] {
  return Array.from({ length: months }, (_, i) => {
    const m = addMonths(month, i - months + 1);
    const s = monthSummary(txs, m);
    return {
      month: m,
      incomeCents: s.incomeCents,
      expenseCents: s.expenseCents,
      savingsRate: s.incomeCents ? s.netCents / s.incomeCents : null,
    };
  });
}

export interface CategoryChange {
  categoryId: string;
  cents: Cents;
  previousCents: Cents;
  /** Évolution par rapport au mois précédent (0,18 = +18 %), `null` sans dépense le mois d'avant. */
  change: number | null;
}

/** Catégories de dépenses du mois, de la plus coûteuse à la moins, avec l'évolution. */
export function topCategories(
  categories: readonly MoneyCategory[],
  txs: readonly MoneyTransaction[],
  month: MonthKey,
): CategoryChange[] {
  const now = monthSummary(txs, month).byCategory;
  const before = monthSummary(txs, addMonths(month, -1)).byCategory;
  return categories
    .filter((c) => c.kind === 'expense' && (now[c.id] ?? 0) > 0)
    .map((c) => {
      const cents = now[c.id] ?? 0;
      const previousCents = before[c.id] ?? 0;
      return {
        categoryId: c.id,
        cents,
        previousCents,
        change: previousCents ? (cents - previousCents) / previousCents : null,
      };
    })
    .sort((a, b) => b.cents - a.cents);
}
