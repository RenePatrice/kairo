/**
 * Check-in des créneaux (« Fait » / « Raté »), journées off, progression du jour et série.
 * Reprend la logique de la maquette : un jour compte dans la série s'il est tenu à 80 % ou plus.
 */
import { addDays, dateKey, type DateKey } from './dates';
import { occursOn, type Occurrence, type Slot } from './schedule';
import { durationMin } from './time';

export type CheckStatus = 'done' | 'missed';

/** Clé `AAAA-MM-JJ|idDuCréneau`. */
export type CheckKey = string;
export type CheckMap = Readonly<Record<CheckKey, CheckStatus>>;

export function checkKey(day: DateKey, slotId: string): CheckKey {
  return `${day}|${slotId}`;
}

export interface HistoryContext {
  checks: CheckMap;
  /** Journées off (rien n'est dû, la série est protégée). */
  restDays: ReadonlySet<DateKey>;
  /** Premier jour avec un check-in ; les jours d'avant ne comptent pas. */
  since?: DateKey | null;
}

export function firstCheckDay(checks: CheckMap): DateKey | null {
  let first: DateKey | null = null;
  for (const k of Object.keys(checks)) {
    const [d = ''] = k.split('|');
    if (first === null || d < first) first = d;
  }
  return first;
}

export interface DayStats {
  due: number;
  done: number;
  /** done / due, ou `null` si rien n'était dû. */
  ratio: number | null;
}

/**
 * Créneaux dus et validés un jour. Avec `nowMin`, seuls les créneaux déjà terminés sont dus
 * (pour aujourd'hui).
 */
export function dayStats(
  slots: readonly Slot[],
  date: Date,
  ctx: HistoryContext,
  nowMin?: number,
): DayStats {
  const k = dateKey(date);
  if ((ctx.since && k < ctx.since) || ctx.restDays.has(k)) return { due: 0, done: 0, ratio: null };
  let due = 0;
  let done = 0;
  for (const s of slots) {
    if (!occursOn(s, date)) continue;
    if (nowMin !== undefined && s.startMin + durationMin(s.startMin, s.endMin) > nowMin) continue;
    due++;
    if (ctx.checks[checkKey(k, s.id)] === 'done') done++;
  }
  return { due, done, ratio: due ? done / due : null };
}

export const STREAK_THRESHOLD = 0.8;
export const STREAK_LOOKBACK_DAYS = 56;

/** Série en cours (jours d'affilée tenus à 80 % ou plus) et record, sur 8 semaines. */
export function streak(
  slots: readonly Slot[],
  now: Date,
  ctx: HistoryContext,
): { current: number; best: number } {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  let current = 0;
  let run = 0;
  let best = 0;
  let counting = true;
  for (let j = 0; j < STREAK_LOOKBACK_DAYS; j++) {
    const st = dayStats(slots, addDays(now, -j), ctx, j === 0 ? nowMin : undefined);
    if (st.ratio === null) continue;
    if (st.ratio >= STREAK_THRESHOLD) {
      run++;
      if (counting) current = run;
    } else {
      if (j === 0) continue;
      counting = false;
      best = Math.max(best, run);
      run = 0;
    }
  }
  return { current, best: Math.max(best, run, current) };
}

export type RowState = 'done' | 'missed' | 'current' | 'due' | 'upcoming';

/** État d'un créneau du jour dans la liste « Aujourd'hui ». */
export function rowState(occ: Occurrence, checks: CheckMap, now: Date): RowState {
  const st = checks[checkKey(occ.day, occ.slot.id)];
  if (st) return st;
  if (occ.start <= now && now < occ.end) return 'current';
  return occ.end <= now ? 'due' : 'upcoming';
}

/** Créneaux terminés qui attendent un check-in. */
export function pendingCheckIns<S extends Slot>(
  occurrences: readonly Occurrence<S>[],
  checks: CheckMap,
  now: Date,
): Occurrence<S>[] {
  return occurrences.filter((o) => o.end <= now && !checks[checkKey(o.day, o.slot.id)]);
}

/** Tous les créneaux du jour sont validés (« Journée parfaite. »). */
export function isPerfectDay(slots: readonly Slot[], date: Date, checks: CheckMap): boolean {
  const k = dateKey(date);
  const list = slots.filter((s) => occursOn(s, date));
  return list.length > 0 && list.every((s) => checks[checkKey(k, s.id)] === 'done');
}
