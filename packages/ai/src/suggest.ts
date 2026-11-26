/**
 * L'IA propose, le code applique. Ce module transforme une intention (des règles) ou une réponse
 * de Llama en `AiSuggestion` « pending » : identifiants résolus, créneaux vérifiés par `core`,
 * avertissements calculés. Rien n'est écrit en base ici.
 */
import {
  draftOverlaps,
  durationMin,
  isAsleep,
  overloadedDays,
  parseTime,
  shortSleepDays,
  startOfWeek,
  validateSlot,
  type SlotError,
} from '@kairo/core';
import {
  findCategoryByName,
  refBlocks,
  type AssistantBlock,
  type AssistantCategory,
  type AssistantContext,
} from './context';
import type { RuleIntent } from './rules';
import {
  AiSuggestion,
  DAY_CODES,
  LlmReply,
  type BlockDraft,
  type DayCode,
  type NewCategory,
  type SuggestionOperation,
  type SuggestionSource,
  type SuggestionWarning,
} from './schema';

/** Rappel par défaut des créneaux ajoutés par l'assistant (« Je te le rappellerai 10 minutes avant »). */
export const ASSISTANT_REMINDER_MIN = 10;

export type ResolveError =
  | { code: 'invalid_json' }
  | { code: 'schema'; issues: string[] }
  | { code: 'unknown_ref'; op: number; ref: string }
  | { code: 'invalid_time'; op: number }
  | { code: 'invalid_slot'; op: number; errors: SlotError[] };

export interface ResolveResult {
  /** `null` si la réponse ne contient aucune opération valide (question, bilan, erreur). */
  suggestion: AiSuggestion | null;
  /** Erreurs à renvoyer au modèle pour une seule nouvelle tentative. */
  errors: ResolveError[];
}

const dayIndex = (d: DayCode): number => DAY_CODES.indexOf(d);

function goalFor(startMin: number, endMin: number, dayCount: number): number {
  return Math.min(80, Math.round((durationMin(startMin, endMin) * Math.max(1, dayCount)) / 60));
}

/** Construit les opérations au fil de l'eau, en gardant les nouvelles activités de la proposition. */
class Draft {
  readonly ops: SuggestionOperation[] = [];
  private readonly created: AssistantCategory[] = [];

  constructor(private readonly ctx: AssistantContext) {}

  category(name: string, weeklyGoalH: number): AssistantCategory {
    const known = findCategoryByName([...this.ctx.categories, ...this.created], name);
    if (known) return known;
    const { palette } = this.ctx;
    const color = palette[(this.ctx.categories.length + this.created.length) % palette.length];
    const category: NewCategory = {
      id: this.ctx.newId(),
      name: name.trim(),
      color: color ?? '#B4A5FF',
      weeklyGoalH,
    };
    this.created.push(category);
    this.ops.push({ op: 'add_category', category });
    return category;
  }

  block(draft: Omit<BlockDraft, 'id' | 'reminderMin' | 'note' | 'steps'> & { steps?: string[] }) {
    this.ops.push({
      op: 'add',
      block: {
        id: this.ctx.newId(),
        reminderMin: ASSISTANT_REMINDER_MIN,
        note: '',
        ...draft,
        steps: draft.steps ?? [],
      },
    });
  }

  categoryName(id: string): string {
    return [...this.ctx.categories, ...this.created].find((c) => c.id === id)?.name ?? '';
  }
}

/** Avertissements de la fiche créneau, appliqués aux propositions : chevauchement et sommeil. */
export function suggestionWarnings(
  ops: readonly SuggestionOperation[],
  ctx: AssistantContext,
  nameOf: (categoryId: string) => string,
): SuggestionWarning[] {
  const removed = new Set(ops.flatMap((o) => (o.op === 'delete' ? [o.blockId] : [])));
  const planned: AssistantBlock[] = ctx.blocks
    .filter((b) => !removed.has(b.id))
    .map((b) => {
      const u = ops.find((o) => o.op === 'update' && o.blockId === b.id);
      return u?.op === 'update' ? { ...b, ...u.patch } : b;
    });
  const warnings: SuggestionWarning[] = [];
  ops.forEach((o, i) => {
    let slot: AssistantBlock | undefined;
    if (o.op === 'add') slot = o.block;
    else if (o.op === 'update') slot = planned.find((b) => b.id === o.blockId);
    if (!slot) return;
    const others = planned.filter((b) => b.id !== slot.id);
    const earlier = ops
      .slice(0, i)
      .flatMap((p) => (p.op === 'add' ? [p.block] : []))
      .filter((b) => b.id !== slot.id);
    const overlaps = draftOverlaps(slot, [...others, ...earlier]);
    if (overlaps.length) {
      const names = [...new Set(overlaps.map((x) => nameOf(x.slot.categoryId)))].filter(Boolean);
      warnings.push({ code: 'overlap', op: i, names, days: [] });
    }
    if (isAsleep(slot.startMin, ctx.rhythm)) {
      warnings.push({ code: 'in_sleep', op: i, names: [], days: [] });
    }
  });

  // Alertes de la semaine en cours que la proposition ferait apparaître (déjà là avant : rien).
  const firstChange = ops.findIndex((o) => o.op === 'add' || o.op === 'update');
  if (firstChange >= 0) {
    const after = [...planned, ...ops.flatMap((o) => (o.op === 'add' ? [o.block] : []))];
    const week = startOfWeek(ctx.now);
    const fresh = (before: number[], now: number[]) => now.filter((d) => !before.includes(d));
    const overload = fresh(
      overloadedDays(ctx.blocks, week, ctx.rhythm),
      overloadedDays(after, week, ctx.rhythm),
    );
    const shortSleep = fresh(
      shortSleepDays(ctx.blocks, week, ctx.rhythm),
      shortSleepDays(after, week, ctx.rhythm),
    );
    if (overload.length)
      warnings.push({ code: 'overload', op: firstChange, names: [], days: overload });
    if (shortSleep.length) {
      warnings.push({ code: 'short_sleep', op: firstChange, names: [], days: shortSleep });
    }
  }
  return warnings;
}

function finish(
  draft: Draft,
  ctx: AssistantContext,
  meta: { kind: AiSuggestion['kind']; summary: string; source: SuggestionSource },
): AiSuggestion {
  return AiSuggestion.parse({
    id: ctx.newId(),
    createdAt: ctx.now.toISOString(),
    ...meta,
    operations: draft.ops,
    warnings: suggestionWarnings(draft.ops, ctx, (id) => draft.categoryName(id)),
    status: 'pending',
  });
}

/** Carte « Parfait. Je cale ça dans … » de la maquette, à partir d'une intention `plan`. */
export function planSuggestion(
  intent: Extract<RuleIntent, { intent: 'plan' }>,
  ctx: AssistantContext,
  newActivityFallback: string,
): AiSuggestion {
  const draft = new Draft(ctx);
  const categoryId =
    intent.categoryId ??
    draft.category(
      intent.newName ?? newActivityFallback,
      goalFor(intent.startMin, intent.endMin, intent.days.length),
    ).id;
  draft.block({
    categoryId,
    days: intent.days,
    once: null,
    startMin: intent.startMin,
    endMin: intent.endMin,
  });
  return finish(draft, ctx, { kind: 'add_block', summary: '', source: 'rules' });
}

function kindOf(ops: readonly SuggestionOperation[]): AiSuggestion['kind'] {
  const adds = ops.filter((o) => o.op === 'add').length;
  if (adds > 1) return 'create_week';
  if (adds === 1) return ops.some((o) => o.op === 'delete') ? 'reschedule' : 'add_block';
  if (ops.some((o) => o.op === 'update')) return 'move_block';
  if (ops.some((o) => o.op === 'delete')) return 'delete_block';
  return 'add_activity';
}

/** Lit la réponse brute du modèle (texte JSON ou objet déjà décodé) puis la traduit. */
export function resolveLlmReply(
  raw: unknown,
  ctx: AssistantContext,
  source: Exclude<SuggestionSource, 'rules'>,
): ResolveResult & { reply: LlmReply | null } {
  let value = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      return { reply: null, suggestion: null, errors: [{ code: 'invalid_json' }] };
    }
  }
  const parsed = LlmReply.safeParse(value);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    return { reply: null, suggestion: null, errors: [{ code: 'schema', issues }] };
  }
  const reply = parsed.data;
  const refs = new Map(refBlocks(ctx).map((r) => [r.ref, r.block]));
  const draft = new Draft(ctx);
  const errors: ResolveError[] = [];

  reply.operations.forEach((o, i) => {
    if (o.op === 'add_activity') {
      draft.category(o.name, o.weeklyGoalH);
      return;
    }
    if (o.op === 'delete_block') {
      const target = refs.get(o.ref);
      if (!target) errors.push({ code: 'unknown_ref', op: i, ref: o.ref });
      else draft.ops.push({ op: 'delete', blockId: target.id });
      return;
    }
    const startMin = parseTime(o.start);
    const endMin = parseTime(o.end);
    if (startMin === null || endMin === null) {
      errors.push({ code: 'invalid_time', op: i });
      return;
    }
    if (o.op === 'move_block') {
      const target = refs.get(o.ref);
      if (!target) {
        errors.push({ code: 'unknown_ref', op: i, ref: o.ref });
        return;
      }
      const days = o.days ? [...new Set(o.days.map(dayIndex))].sort((a, b) => a - b) : undefined;
      const slotErrors = validateSlot({ ...target, startMin, endMin, ...(days ? { days } : {}) });
      if (slotErrors.length) errors.push({ code: 'invalid_slot', op: i, errors: slotErrors });
      else
        draft.ops.push({
          op: 'update',
          blockId: target.id,
          patch: { startMin, endMin, ...(days ? { days } : {}) },
        });
      return;
    }
    const days = o.date ? [] : [...new Set(o.days.map(dayIndex))].sort((a, b) => a - b);
    const once = o.date ?? null;
    const slotErrors = validateSlot({ id: 'draft', days, once, startMin, endMin });
    if (slotErrors.length) {
      errors.push({ code: 'invalid_slot', op: i, errors: slotErrors });
      return;
    }
    const category = draft.category(o.activity, goalFor(startMin, endMin, days.length || 1));
    draft.block({ categoryId: category.id, days, once, startMin, endMin, steps: o.steps ?? [] });
  });

  const suggestion = draft.ops.length
    ? finish(draft, ctx, { kind: kindOf(draft.ops), summary: reply.message, source })
    : null;
  return { reply, suggestion, errors };
}
