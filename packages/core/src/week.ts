/**
 * Calculs de l'écran Semaine de la maquette : charge par jour, fenêtre horaire de la vue
 * d'ensemble, répartition par activité, copie d'un jour, chevauchements et créneau libre.
 */
import { slotConflicts } from './conflicts';
import { addDays } from './dates';
import { awakeMinutes, ceilQuarter, dayAnchor, type Rhythm } from './rhythm';
import { occursOn, type Slot } from './schedule';
import { MINUTES_PER_DAY, durationMin } from './time';

export function weekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

/** Minutes prévues un jour donné. */
export function dayLoad(slots: readonly Slot[], date: Date): number {
  return slots.reduce(
    (sum, s) => (occursOn(s, date) ? sum + durationMin(s.startMin, s.endMin) : sum),
    0,
  );
}

export function weekLoads(slots: readonly Slot[], weekStart: Date): number[] {
  return weekDates(weekStart).map((d) => dayLoad(slots, d));
}

export interface DayWindow {
  /** Minutes ancrées sur la journée, arrondies à l'heure. */
  start: number;
  end: number;
  span: number;
}

/** Fenêtre commune à toute la semaine : de l'éveil au coucher, élargie aux créneaux. */
export function weekWindow(slots: readonly Slot[], rhythm: Rhythm): DayWindow {
  let start = rhythm.wakeMin;
  let end = rhythm.wakeMin + awakeMinutes(rhythm);
  for (const s of slots) {
    const s0 = dayAnchor(s.startMin, rhythm);
    start = Math.min(start, s0);
    end = Math.max(end, s0 + durationMin(s.startMin, s.endMin));
  }
  start = Math.floor(start / 60) * 60;
  end = Math.ceil(end / 60) * 60;
  return { start, end, span: Math.max(60, end - start) };
}

export interface OverviewSegment<S extends Slot> {
  slot: S;
  /** Position et largeur en pourcentage de la fenêtre. */
  left: number;
  width: number;
}

export function overviewSegments<S extends Slot>(
  slots: readonly S[],
  date: Date,
  win: DayWindow,
  rhythm: Rhythm,
): OverviewSegment<S>[] {
  const out: OverviewSegment<S>[] = [];
  for (const s of slots) {
    if (!occursOn(s, date)) continue;
    const s0 = dayAnchor(s.startMin, rhythm);
    const from = Math.max(s0, win.start);
    const to = Math.min(s0 + durationMin(s.startMin, s.endMin), win.end);
    if (to <= from) continue;
    out.push({
      slot: s,
      left: ((from - win.start) / win.span) * 100,
      width: ((to - from) / win.span) * 100,
    });
  }
  return out.sort((a, b) => a.left - b.left);
}

export interface MixEntry<K extends string> {
  key: K;
  minutes: number;
  /** Part de la semaine, 0..1. */
  share: number;
}

/** Répartition des minutes prévues de la semaine par clé (activité), de la plus grosse à la plus petite. */
export function weekMix<S extends Slot, K extends string>(
  slots: readonly S[],
  weekStart: Date,
  keyOf: (slot: S) => K,
): MixEntry<K>[] {
  const totals = new Map<K, number>();
  for (const d of weekDates(weekStart)) {
    for (const s of slots) {
      if (!occursOn(s, d)) continue;
      const k = keyOf(s);
      totals.set(k, (totals.get(k) ?? 0) + durationMin(s.startMin, s.endMin));
    }
  }
  const all = [...totals.values()].reduce((a, b) => a + b, 0);
  return [...totals.entries()]
    .filter(([, m]) => m > 0)
    .map(([key, minutes]) => ({ key, minutes, share: minutes / Math.max(1, all) }))
    .sort((a, b) => b.minutes - a.minutes);
}

/** Minutes prévues cette semaine pour une clé. */
export function weekMinutesFor<S extends Slot>(
  slots: readonly S[],
  weekStart: Date,
  match: (slot: S) => boolean,
): number {
  return weekLoads(slots.filter(match), weekStart).reduce((a, b) => a + b, 0);
}

/**
 * « Copier un jour » : ajoute les jours cibles aux créneaux récurrents du jour source, sauf
 * là où le créneau chevaucherait un horaire déjà pris (pas de chevauchement).
 */
export function copyDay<S extends Slot>(
  slots: readonly S[],
  source: number,
  targets: readonly number[],
): S[] {
  const out = [...slots];
  out.forEach((s, i) => {
    if (s.once || !s.days.includes(source)) return;
    const others = out.filter((_, j) => j !== i);
    const free = targets.filter(
      (d) => !s.days.includes(d) && !slotConflicts({ ...s, days: [d] }, others).length,
    );
    if (!free.length) return;
    out[i] = { ...s, days: [...new Set([...s.days, ...free])].sort((a, b) => a - b) };
  });
  return out;
}

/** Nombre de créneaux récurrents du jour (ceux que « Copier un jour » dupliquera). */
export function recurringOn(slots: readonly Slot[], weekday: number): number {
  return slots.filter((s) => !s.once && s.days.includes(weekday)).length;
}

export interface DraftOverlap<S extends Slot> {
  slot: S;
  sharedDays: number[];
}

/**
 * Créneaux récurrents qui chevauchent un brouillon sur au moins un jour commun
 * (avertissement « Chevauche … » de la fiche créneau ; le chevauchement reste permis).
 */
export function draftOverlaps<S extends Slot>(draft: Slot, slots: readonly S[]): DraftOverlap<S>[] {
  if (draft.once) return [];
  const a0 = draft.startMin;
  const a1 = a0 + durationMin(draft.startMin, draft.endMin);
  const out: DraftOverlap<S>[] = [];
  for (const s of slots) {
    if (s.id === draft.id || s.once) continue;
    const sharedDays = s.days.filter((d) => draft.days.includes(d));
    if (!sharedDays.length) continue;
    const b0 = s.startMin;
    const b1 = b0 + durationMin(s.startMin, s.endMin);
    if (a0 < b1 && b0 < a1)
      out.push({ slot: s, sharedDays: [...sharedDays].sort((x, y) => x - y) });
  }
  return out;
}

/**
 * Premier quart d'heure libre à partir de `fromMin` pour caser `length` minutes avant le coucher
 * (« Raté. Je le recale ? »). `null` si la journée est pleine.
 */
export function findFreeStart(
  slots: readonly Slot[],
  date: Date,
  length: number,
  fromMin: number,
  rhythm: Rhythm,
): number | null {
  const list = slots.filter((s) => occursOn(s, date));
  const limit = rhythm.sleepMin > rhythm.wakeMin ? rhythm.sleepMin : MINUTES_PER_DAY;
  for (let t = ceilQuarter(fromMin); t + length <= limit; t += 15) {
    const clash = list.some((x) => {
      const x1 = x.startMin + durationMin(x.startMin, x.endMin);
      return t < x1 && x.startMin < t + length;
    });
    if (!clash) return t;
  }
  return null;
}

export type DaysPreset = 'all' | 'weekdays' | 'weekend' | 'custom';

export function daysPreset(days: readonly number[]): DaysPreset {
  const s = [...new Set(days)].sort((a, b) => a - b).join();
  if (s === '0,1,2,3,4,5,6') return 'all';
  if (s === '0,1,2,3,4') return 'weekdays';
  if (s === '5,6') return 'weekend';
  return 'custom';
}
