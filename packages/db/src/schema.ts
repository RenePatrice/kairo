/**
 * Modèle de données de Kairo, tel que la maquette l'utilise : des activités (nom, couleur,
 * objectif d'heures par semaine), des créneaux récurrents ou ponctuels, des check-ins,
 * des journées off et les réglages. Les schémas Zod sont la source de vérité des types ;
 * ils valident aussi les sauvegardes importées.
 */
import { AiSuggestion } from '@kairo/ai';
import { z } from 'zod';

export const DB_VERSION = 3;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const minute = z.number().int().min(0).max(1439);
const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/);
const timestamp = z.string();
/** Suppression logique (0/1, indexable), pour une synchro future sans douleur. */
const deleted = z.union([z.literal(0), z.literal(1)]);

export const themeNames = ['minuit', 'oled', 'papier'] as const;
export const accentNames = ['lav', 'lagon', 'miel', 'corail', 'menthe'] as const;
export const localeNames = ['fr', 'en'] as const;

export const CategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(60),
  color: hex,
  /** Objectif d'heures par semaine ; 0 = libre. */
  weeklyGoalH: z.number().int().min(0).max(80),
  order: z.number(),
  updatedAt: timestamp,
  deleted,
});
export type Category = z.infer<typeof CategorySchema>;

export const BlockSchema = z.object({
  id: z.string().min(1),
  categoryId: z.string().min(1),
  /** Jours de répétition, lundi = 0 ; vide pour un créneau ponctuel. */
  days: z.array(z.number().int().min(0).max(6)),
  /** Date du créneau ponctuel, sinon `null`. */
  once: isoDate.nullable(),
  startMin: minute,
  endMin: minute,
  /** Rappel N minutes avant ; `null` = aucun. */
  reminderMin: z.number().int().min(0).max(240).nullable(),
  steps: z.array(z.string().min(1).max(200)),
  note: z.string().max(500),
  updatedAt: timestamp,
  deleted,
});
export type Block = z.infer<typeof BlockSchema>;

export const CompletionSchema = z.object({
  /** `AAAA-MM-JJ|idDuCréneau`. */
  id: z.string().min(1),
  date: isoDate,
  blockId: z.string().min(1),
  status: z.enum(['done', 'missed']),
  updatedAt: timestamp,
});
export type Completion = z.infer<typeof CompletionSchema>;

export const StepProgressSchema = z.object({
  /** `AAAA-MM-JJ|idDuCréneau`. */
  id: z.string().min(1),
  done: z.array(z.number().int().min(0)),
  updatedAt: timestamp,
});
export type StepProgress = z.infer<typeof StepProgressSchema>;

export const RestDaySchema = z.object({ date: isoDate, updatedAt: timestamp });
export type RestDay = z.infer<typeof RestDaySchema>;

/** Note d'énergie après « Fait » : 1 vidé, 2 correct, 3 en feu. */
export const EnergySchema = z.object({
  /** `AAAA-MM-JJ|idDuCréneau`. */
  id: z.string().min(1),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  updatedAt: timestamp,
});
export type Energy = z.infer<typeof EnergySchema>;

const goalText = z.string().max(120);

/** Objectif du jour (`D2026-11-23`) ou de la semaine (`W2026-48`). */
export const GoalSchema = z.discriminatedUnion('scope', [
  z.object({
    id: z.string().regex(/^D\d{4}-\d{2}-\d{2}$/),
    scope: z.literal('D'),
    kind: z.enum(['blocks', 'hours', 'free']),
    target: z.number().min(0).max(100),
    text: goalText,
    updatedAt: timestamp,
  }),
  z.object({
    id: z.string().regex(/^W\d{4}-\d{2}$/),
    scope: z.literal('W'),
    kind: z.enum(['hours', 'rate', 'act']),
    target: z.number().min(0).max(168),
    /** Activité visée par un objectif `act`. */
    categoryId: z.string().min(1).nullable(),
    text: goalText,
    updatedAt: timestamp,
  }),
]);
export type Goal = z.infer<typeof GoalSchema>;

/** Bilan du jour ou de la semaine, écrit par l'utilisateur ou rédigé par l'IA. */
export const ReviewSchema = z.object({
  id: z.string().regex(/^(D\d{4}-\d{2}-\d{2}|W\d{4}-\d{2})$/),
  mood: z.number().int().min(1).max(5),
  /** « Ce qui a marché ». */
  a: z.string().max(600),
  /** « À ajuster ». */
  b: z.string().max(600),
  summary: z.string().max(800),
  ai: z.boolean(),
  updatedAt: timestamp,
});
export type Review = z.infer<typeof ReviewSchema>;

export const SuggestionSchema = AiSuggestion.extend({ updatedAt: timestamp });
export type Suggestion = z.infer<typeof SuggestionSchema>;

// ---- Budget (v3) : montants en centimes entiers.

const cents = z.number().int().min(-1_000_000_000_00).max(1_000_000_000_00);
const positiveCents = z.number().int().min(1).max(1_000_000_000_00);

export const accountKinds = ['bank', 'cash', 'mobile', 'savings', 'other'] as const;

export const MoneyAccountSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(40),
  kind: z.enum(accountKinds),
  /** Solde au moment où le compte est ajouté. */
  openingCents: cents,
  order: z.number(),
  updatedAt: timestamp,
  deleted,
});
export type MoneyAccountRow = z.infer<typeof MoneyAccountSchema>;

export const MoneyCategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(40),
  color: hex,
  kind: z.enum(['expense', 'income']),
  /** Plafond mensuel de l'enveloppe ; `null` = pas d'enveloppe. */
  monthlyLimitCents: positiveCents.nullable(),
  order: z.number(),
  updatedAt: timestamp,
  deleted,
});
export type MoneyCategoryRow = z.infer<typeof MoneyCategorySchema>;

export const MoneyTransactionSchema = z
  .object({
    id: z.string().min(1),
    kind: z.enum(['expense', 'income', 'transfer']),
    amountCents: positiveCents,
    date: isoDate,
    accountId: z.string().min(1),
    toAccountId: z.string().min(1).nullable(),
    categoryId: z.string().min(1).nullable(),
    recurringId: z.string().min(1).nullable(),
    note: z.string().max(200),
    updatedAt: timestamp,
    deleted,
  })
  .refine(
    (t) =>
      t.kind === 'transfer'
        ? t.toAccountId !== null && t.toAccountId !== t.accountId && t.categoryId === null
        : t.categoryId !== null && t.toAccountId === null,
    { message: 'transfer-or-category' },
  );
export type MoneyTransactionRow = z.infer<typeof MoneyTransactionSchema>;

export const MoneyRecurringSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['expense', 'income']),
  amountCents: positiveCents,
  accountId: z.string().min(1),
  categoryId: z.string().min(1),
  dayOfMonth: z.number().int().min(1).max(31),
  startDate: isoDate,
  note: z.string().max(200),
  active: z.boolean(),
  updatedAt: timestamp,
  deleted,
});
export type MoneyRecurringRow = z.infer<typeof MoneyRecurringSchema>;

export const SavingsGoalSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(40),
  targetCents: positiveCents,
  deadline: isoDate.nullable(),
  /** Compte dont le solde mesure l'épargne ; sinon `savedCents`. */
  accountId: z.string().min(1).nullable(),
  savedCents: z.number().int().min(0),
  color: hex,
  updatedAt: timestamp,
  deleted,
});
export type SavingsGoalRow = z.infer<typeof SavingsGoalSchema>;

export const OptionsSchema = z.object({
  /** Réduire la transparence : surfaces pleines. */
  solid: z.boolean(),
  remind: z.boolean(),
  /** IA sur le téléphone (Llama local), utilisée en Phase 2. */
  local: z.boolean(),
  haptic: z.boolean(),
  autoReview: z.boolean(),
  endCheck: z.boolean(),
  clock12: z.boolean(),
  big: z.boolean(),
});
export type Options = z.infer<typeof OptionsSchema>;

export const ProfileSchema = z.object({
  name: z.string().max(60),
  role: z.string().max(80),
  wakeMin: minute,
  sleepMin: minute,
});
export type Profile = z.infer<typeof ProfileSchema>;

export const SettingsSchema = z.object({
  id: z.literal('app'),
  /** `null` tant que l'utilisateur n'a pas choisi sa langue (premier écran). */
  locale: z.enum(localeNames).nullable(),
  started: z.boolean(),
  profile: ProfileSchema,
  theme: z.enum(themeNames),
  accent: z.enum(accentNames),
  options: OptionsSchema,
  /** Trophées déjà annoncés (« Trophée débloqué : … »). */
  trophiesSeen: z.array(z.string()).default([]),
  /** Sessions focus terminées (trophée « Esprit clair »). */
  focusCount: z.number().int().min(0).default(0),
  /** App ouverte en dernier : planning (« Temps ») ou « Budget ». */
  mode: z.enum(['time', 'budget']).default('time'),
  /** Budget : devise ISO 4217 (« EUR ») ; `null` tant que le Budget n'est pas configuré. */
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .nullable()
    .default(null),
  schemaVersion: z.number().int(),
  updatedAt: timestamp,
});
export type Settings = z.infer<typeof SettingsSchema>;
export type ThemeName = Settings['theme'];
export type AccentName = Settings['accent'];
export type LocaleName = (typeof localeNames)[number];

export const DEFAULT_OPTIONS: Options = {
  solid: false,
  remind: true,
  local: true,
  haptic: true,
  autoReview: false,
  endCheck: false,
  clock12: false,
  big: false,
};

export function defaultSettings(now = new Date()): Settings {
  return {
    id: 'app',
    locale: null,
    started: false,
    profile: { name: '', role: '', wakeMin: 420, sleepMin: 1410 },
    theme: 'minuit',
    accent: 'lav',
    options: { ...DEFAULT_OPTIONS },
    trophiesSeen: [],
    focusCount: 0,
    mode: 'time',
    currency: null,
    schemaVersion: DB_VERSION,
    updatedAt: now.toISOString(),
  };
}

export const BackupSchema = z.object({
  app: z.literal('kairo'),
  schemaVersion: z.number().int().min(1).max(DB_VERSION),
  exportedAt: timestamp,
  settings: SettingsSchema,
  categories: z.array(CategorySchema),
  blocks: z.array(BlockSchema),
  completions: z.array(CompletionSchema),
  stepProgress: z.array(StepProgressSchema),
  restDays: z.array(RestDaySchema),
  // Tables de la v2 : absentes d'une sauvegarde v1.
  energy: z.array(EnergySchema).default([]),
  goals: z.array(GoalSchema).default([]),
  reviews: z.array(ReviewSchema).default([]),
  suggestions: z.array(SuggestionSchema).default([]),
  // Tables de la v3 (Budget) : absentes d'une sauvegarde plus ancienne.
  accounts: z.array(MoneyAccountSchema).default([]),
  moneyCategories: z.array(MoneyCategorySchema).default([]),
  transactions: z.array(MoneyTransactionSchema).default([]),
  recurrings: z.array(MoneyRecurringSchema).default([]),
  savingsGoals: z.array(SavingsGoalSchema).default([]),
});
export type Backup = z.infer<typeof BackupSchema>;
