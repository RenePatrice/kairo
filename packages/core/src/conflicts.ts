/**
 * Horaires déjà pris : un nouveau créneau ne peut pas chevaucher un créneau existant.
 * Couvre les créneaux récurrents (chaque semaine) et ponctuels (une date), y compris ceux qui
 * débordent après minuit sur le lendemain.
 */
import { isoWeekday, parseDateKey, type DateKey } from './dates';
import type { Slot } from './schedule';
import { MINUTES_PER_DAY, durationMin, normalizeMinute } from './time';

const WEEK = 7 * MINUTES_PER_DAY;
const DAY_MS = 86_400_000;

export interface SlotConflict<S extends Slot> {
  slot: S;
  /** Jours de la semaine (lundi = 0) où le nouveau créneau commence et chevauche celui-ci. */
  days: number[];
}

type Span = { from: number; to: number; day: number };

/** Plages d'un créneau récurrent, en minutes depuis le lundi 00:00. */
function weeklySpans(slot: Slot): Span[] {
  const len = durationMin(slot.startMin, slot.endMin);
  return slot.days.map((day) => {
    const from = day * MINUTES_PER_DAY + slot.startMin;
    return { from, to: from + len, day };
  });
}

/** Plage d'un créneau ponctuel, en minutes depuis l'époque (heure locale). */
function absoluteSpan(slot: Slot & { once: string }): Span {
  const d = parseDateKey(slot.once);
  const dayNumber = Math.round(
    (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(1970, 0, 1)) / DAY_MS,
  );
  const from = dayNumber * MINUTES_PER_DAY + slot.startMin;
  return { from, to: from + durationMin(slot.startMin, slot.endMin), day: isoWeekday(d) };
}

const overlap = (a: Span, b: Span, shift = 0) => a.from < b.to + shift && b.from + shift < a.to;

/** Chevauchement dans une semaine qui boucle (dimanche soir → lundi matin). */
const weeklyOverlap = (a: Span, b: Span) => [-WEEK, 0, WEEK].some((s) => overlap(a, b, s));

/** Ramène une plage ponctuelle dans la semaine (minutes depuis le lundi 00:00). */
function inWeek(span: Span): Span {
  const offset = span.day * MINUTES_PER_DAY + normalizeMinute(span.from);
  return { from: offset, to: offset + (span.to - span.from), day: span.day };
}

/**
 * Créneaux existants qui chevauchent `draft` (le créneau lui-même est ignoré). Avec `today`,
 * les créneaux ponctuels déjà passés ne bloquent plus rien.
 */
export function slotConflicts<S extends Slot>(
  draft: Slot,
  slots: readonly S[],
  today?: DateKey,
): SlotConflict<S>[] {
  const out: SlotConflict<S>[] = [];
  const draftOnce = draft.once ? absoluteSpan({ ...draft, once: draft.once }) : null;
  const draftSpans = draftOnce ? [inWeek(draftOnce)] : weeklySpans(draft);
  for (const s of slots) {
    if (s.id === draft.id || (today && s.once && s.once < today)) continue;
    const days = new Set<number>();
    if (draftOnce && s.once) {
      if (overlap(draftOnce, absoluteSpan({ ...s, once: s.once }))) days.add(draftOnce.day);
    } else {
      const otherSpans = s.once ? [inWeek(absoluteSpan({ ...s, once: s.once }))] : weeklySpans(s);
      for (const a of draftSpans) {
        if (otherSpans.some((b) => weeklyOverlap(a, b))) days.add(a.day);
      }
    }
    if (days.size) out.push({ slot: s, days: [...days].sort((x, y) => x - y) });
  }
  return out;
}

/**
 * Premier horaire libre de même durée à partir du début actuel, par pas de 15 minutes, sur
 * 24 heures. `null` si tout est pris.
 */
export function nextFreeStart(
  draft: Slot,
  slots: readonly Slot[],
  today?: DateKey,
  step = 15,
): number | null {
  const len = durationMin(draft.startMin, draft.endMin);
  const base = Math.ceil(draft.startMin / step) * step;
  for (let k = 0; k < MINUTES_PER_DAY / step; k++) {
    const startMin = normalizeMinute(base + k * step);
    const candidate = { ...draft, startMin, endMin: normalizeMinute(startMin + len) };
    if (!slotConflicts(candidate, slots, today).length) return startMin;
  }
  return null;
}
