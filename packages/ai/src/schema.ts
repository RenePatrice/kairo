/**
 * Schémas Zod de l'assistant. Deux niveaux :
 * - `LlmReply` : ce que Llama renvoie (JSON contraint), volontairement simple pour un petit modèle :
 *   jours en toutes lettres courtes, heures « HH:MM », créneaux désignés par b1, b2… ;
 * - `AiSuggestion` : la proposition traduite vers le modèle de données de Kairo, affichée en carte
 *   et appliquée seulement quand l'utilisateur la valide.
 */
import { z } from 'zod';

export const DAY_CODES = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export const DayCode = z.enum(DAY_CODES);
export type DayCode = z.infer<typeof DayCode>;

const HHMM = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const BlockRef = z.string().regex(/^b\d+$/);
const ActivityName = z.string().trim().min(1).max(60);

export const LlmOperation = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('add_activity'),
    name: ActivityName,
    weeklyGoalH: z.number().int().min(0).max(80),
  }),
  z.object({
    op: z.literal('add_block'),
    activity: ActivityName,
    /** Jours de répétition ; vide si `date` est donnée (créneau ponctuel). */
    days: z.array(DayCode).max(7),
    date: IsoDate.nullable(),
    start: HHMM,
    end: HHMM,
    steps: z.array(z.string().trim().min(1).max(200)).max(10).optional(),
  }),
  z.object({
    op: z.literal('move_block'),
    ref: BlockRef,
    days: z.array(DayCode).max(7).optional(),
    start: HHMM,
    end: HHMM,
  }),
  z.object({ op: z.literal('delete_block'), ref: BlockRef }),
]);
export type LlmOperation = z.infer<typeof LlmOperation>;

export const LLM_INTENTS = [
  'plan',
  'free_time',
  'day_review',
  'week_review',
  'analysis',
  'answer',
  'need_info',
] as const;

export const LlmReply = z.object({
  intent: z.enum(LLM_INTENTS),
  /** Une ou deux phrases, dans la langue de l'utilisateur ; expliquent la proposition. */
  message: z.string().trim().min(1).max(600),
  operations: z.array(LlmOperation).max(40),
});
export type LlmReply = z.infer<typeof LlmReply>;

/** Schéma JSON imposé au modèle (format d'Ollama, grammaire de llama.cpp / WebLLM). */
export const llmReplyJsonSchema = z.toJSONSchema(LlmReply, { io: 'input' });

const minute = z.number().int().min(0).max(1439);
const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

export const NewCategory = z.object({
  id: z.string().min(1),
  name: ActivityName,
  color: hex,
  weeklyGoalH: z.number().int().min(0).max(80),
});
export type NewCategory = z.infer<typeof NewCategory>;

/** Créneau proposé, au format des blocs Dexie (sans les champs techniques). */
export const BlockDraft = z.object({
  id: z.string().min(1),
  /** Activité existante, ou activité créée par une opération `add_category` de la même proposition. */
  categoryId: z.string().min(1),
  days: z.array(z.number().int().min(0).max(6)),
  once: IsoDate.nullable(),
  startMin: minute,
  endMin: minute,
  reminderMin: z.number().int().min(0).max(240).nullable(),
  steps: z.array(z.string().min(1).max(200)),
  note: z.string().max(500),
});
export type BlockDraft = z.infer<typeof BlockDraft>;

export const SuggestionOperation = z.discriminatedUnion('op', [
  z.object({ op: z.literal('add_category'), category: NewCategory }),
  z.object({ op: z.literal('add'), block: BlockDraft }),
  z.object({
    op: z.literal('update'),
    blockId: z.string().min(1),
    patch: BlockDraft.pick({ days: true, startMin: true, endMin: true }).partial(),
  }),
  z.object({ op: z.literal('delete'), blockId: z.string().min(1) }),
]);
export type SuggestionOperation = z.infer<typeof SuggestionOperation>;

/** Avertissements calculés par `core` (jamais par le modèle). */
export const SuggestionWarning = z.object({
  /**
   * `overlap` : chevauche d'autres créneaux ; `in_sleep` : commence pendant le sommeil ;
   * `overload` : journée plus remplie que le temps d'éveil ; `short_sleep` : nuit de moins de 7 h.
   */
  code: z.enum(['overlap', 'in_sleep', 'overload', 'short_sleep']),
  /** Index de l'opération concernée. */
  op: z.number().int().min(0),
  /** Activités chevauchées, pour « Chevauche Salle (mar.) ». */
  names: z.array(z.string()),
  /** Jours de la semaine touchés (lundi = 0), pour la surcharge et le sommeil. */
  days: z.array(z.number().int().min(0).max(6)).default([]),
});
export type SuggestionWarning = z.infer<typeof SuggestionWarning>;

export const AiSuggestion = z.object({
  id: z.string().min(1),
  createdAt: z.string(),
  kind: z.enum([
    'add_block',
    'add_activity',
    'create_week',
    'move_block',
    'delete_block',
    'reschedule',
  ]),
  /** Texte affiché à l'utilisateur (phrase du modèle, ou vide : l'interface rédige via i18n). */
  summary: z.string().max(600),
  operations: z.array(SuggestionOperation).min(1).max(60),
  warnings: z.array(SuggestionWarning),
  source: z.enum(['rules', 'local', 'server']),
  status: z.enum(['pending', 'applied', 'dismissed']),
});
export type AiSuggestion = z.infer<typeof AiSuggestion>;
export type SuggestionSource = AiSuggestion['source'];
