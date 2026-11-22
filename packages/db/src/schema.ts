/**
 * Modèle de données de Kairo, tel que la maquette l'utilise : des activités (nom, couleur,
 * objectif d'heures par semaine), des créneaux récurrents ou ponctuels, des check-ins,
 * des journées off et les réglages. Les schémas Zod sont la source de vérité des types ;
 * ils valident aussi les sauvegardes importées.
 */
import { z } from 'zod';

export const DB_VERSION = 1;

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
});
export type Backup = z.infer<typeof BackupSchema>;
