/**
 * Logique de planning : quels créneaux tombent quel jour, ce qui est en cours, ce qui suit,
 * les chevauchements et les moments libres. Règle d'or : un créneau appartient au jour
 * où il COMMENCE, même s'il finit après minuit.
 */
import { addDays, atMinute, dateKey, isDateKey, isoWeekday, type DateKey } from './dates';
import { MINUTES_PER_DAY, durationMin, isValidMinute } from './time';

/** Forme minimale d'un créneau, compatible avec les blocs de la maquette. */
export interface Slot {
  id: string;
  /** Jours de répétition, lundi = 0 … dimanche = 6. Ignoré si `once` est défini. */
  days: readonly number[];
  /** Heure murale de début, 0..1439. */
  startMin: number;
  /** Heure murale de fin, 0..1439 ; si elle est avant le début, le créneau passe minuit. */
  endMin: number;
  /** Créneau ponctuel : la seule date où il a lieu. */
  once?: DateKey | null;
}

export interface Occurrence<S extends Slot = Slot> {
  slot: S;
  /** Jour où le créneau commence. */
  day: DateKey;
  startMin: number;
  durationMin: number;
  start: Date;
  end: Date;
}

export const MIN_SLOT_DURATION = 5;

export function occursOn(slot: Slot, date: Date): boolean {
  if (slot.once) return slot.once === dateKey(date);
  return slot.days.includes(isoWeekday(date));
}

function toOccurrence<S extends Slot>(slot: S, date: Date): Occurrence<S> {
  const day = dateKey(date);
  const duration = durationMin(slot.startMin, slot.endMin);
  return {
    slot,
    day,
    startMin: slot.startMin,
    durationMin: duration,
    start: atMinute(date, slot.startMin),
    end: atMinute(date, slot.startMin + duration),
  };
}

const byStart = (a: Occurrence, b: Occurrence): number =>
  a.startMin - b.startMin || b.durationMin - a.durationMin || a.slot.id.localeCompare(b.slot.id);

/** Créneaux qui commencent ce jour-là, triés par heure de début. */
export function occurrencesOn<S extends Slot>(slots: readonly S[], date: Date): Occurrence<S>[] {
  return slots
    .filter((s) => occursOn(s, date))
    .map((s) => toOccurrence(s, date))
    .sort(byStart);
}

export interface NowAndNext<S extends Slot> {
  current: Occurrence<S> | null;
  next: Occurrence<S> | null;
}

/**
 * Créneau en cours (y compris un créneau commencé la veille) et prochain créneau,
 * cherché jusqu'à `horizonDays` jours plus loin. La fin d'un créneau est exclusive.
 */
export function nowAndNext<S extends Slot>(
  slots: readonly S[],
  now: Date,
  horizonDays = 7,
): NowAndNext<S> {
  const t = now.getTime();
  const candidates = [...occurrencesOn(slots, addDays(now, -1)), ...occurrencesOn(slots, now)];
  let current: Occurrence<S> | null = null;
  for (const occ of candidates) {
    if (occ.start.getTime() <= t && t < occ.end.getTime()) {
      if (!current || occ.start.getTime() >= current.start.getTime()) current = occ;
    }
  }
  let next: Occurrence<S> | null = null;
  for (let i = 0; i <= horizonDays && !next; i++) {
    next = occurrencesOn(slots, addDays(now, i)).find((o) => o.start.getTime() > t) ?? null;
  }
  return { current, next };
}

/** Avancement du créneau, de 0 (pas commencé) à 1 (terminé). */
export function progress(occ: Occurrence, now: Date): number {
  const total = occ.end.getTime() - occ.start.getTime();
  const done = now.getTime() - occ.start.getTime();
  return Math.min(1, Math.max(0, done / total));
}

export function remainingMs(occ: Occurrence, now: Date): number {
  return Math.max(0, occ.end.getTime() - now.getTime());
}

interface Interval<S extends Slot> {
  occurrence: Occurrence<S>;
  /** Minutes relatives au minuit du jour étudié (négatif = veille). */
  from: number;
  to: number;
  fromPreviousDay: boolean;
}

/** Créneaux du jour + débordement des créneaux de la veille, en minutes relatives. */
function dayIntervals<S extends Slot>(slots: readonly S[], date: Date): Interval<S>[] {
  const previous = occurrencesOn(slots, addDays(date, -1))
    .filter((o) => o.startMin + o.durationMin > MINUTES_PER_DAY)
    .map((o) => ({
      occurrence: o,
      from: o.startMin - MINUTES_PER_DAY,
      to: o.startMin + o.durationMin - MINUTES_PER_DAY,
      fromPreviousDay: true,
    }));
  const today = occurrencesOn(slots, date).map((o) => ({
    occurrence: o,
    from: o.startMin,
    to: o.startMin + o.durationMin,
    fromPreviousDay: false,
  }));
  return [...previous, ...today];
}

/** Paires de créneaux qui se chevauchent ce jour-là (permis, mais à signaler). */
export function findConflicts<S extends Slot>(
  slots: readonly S[],
  date: Date,
): Array<[Occurrence<S>, Occurrence<S>]> {
  const list = dayIntervals(slots, date);
  const pairs: Array<[Occurrence<S>, Occurrence<S>]> = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i] as Interval<S>;
      const b = list[j] as Interval<S>;
      if (a.fromPreviousDay && b.fromPreviousDay) continue;
      if (a.from < b.to && b.from < a.to) pairs.push([a.occurrence, b.occurrence]);
    }
  }
  return pairs;
}

export interface LaneLayout<S extends Slot> {
  occurrence: Occurrence<S>;
  /** Colonne du créneau dans son groupe de chevauchements (0 = gauche). */
  lane: number;
  /** Nombre de colonnes du groupe : la largeur vaut 1 / lanes. */
  lanes: number;
}

/** Répartit en colonnes côte à côte les créneaux qui se chevauchent. */
export function layoutLanes<S extends Slot>(
  occurrences: readonly Occurrence<S>[],
): LaneLayout<S>[] {
  const sorted = [...occurrences].sort(byStart);
  const result: LaneLayout<S>[] = [];
  let group: LaneLayout<S>[] = [];
  let laneEnds: number[] = [];
  let groupEnd = -Infinity;

  const closeGroup = () => {
    for (const item of group) item.lanes = laneEnds.length;
    result.push(...group);
    group = [];
    laneEnds = [];
  };

  for (const occ of sorted) {
    const end = occ.startMin + occ.durationMin;
    if (occ.startMin >= groupEnd) closeGroup();
    let lane = laneEnds.findIndex((e) => e <= occ.startMin);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(end);
    } else {
      laneEnds[lane] = end;
    }
    group.push({ occurrence: occ, lane, lanes: 0 });
    groupEnd = Math.max(groupEnd, end);
  }
  closeGroup();
  return result;
}

export interface FreeWindow {
  startMin: number;
  endMin: number;
}

export interface FreeWindowOptions {
  /** Début de la plage étudiée (ex. heure de lever), en minutes relatives au jour. */
  fromMin: number;
  /** Fin de la plage (ex. coucher) ; peut dépasser 1440 pour une nuit après minuit. */
  toMin: number;
  /** Ignore les trous plus courts que cette durée. */
  minLength?: number;
}

/** Moments libres d'une journée, entre `fromMin` et `toMin`. */
export function freeWindows(
  slots: readonly Slot[],
  date: Date,
  { fromMin, toMin, minLength = 1 }: FreeWindowOptions,
): FreeWindow[] {
  const busy = [
    ...dayIntervals(slots, date).map((i) => [i.from, i.to] as const),
    ...occurrencesOn(slots, addDays(date, 1)).map(
      (o) => [o.startMin + MINUTES_PER_DAY, o.startMin + o.durationMin + MINUTES_PER_DAY] as const,
    ),
  ].sort((a, b) => a[0] - b[0]);

  const free: FreeWindow[] = [];
  let cursor = fromMin;
  for (const [from, to] of busy) {
    if (from > cursor) free.push({ startMin: cursor, endMin: Math.min(from, toMin) });
    cursor = Math.max(cursor, to);
    if (cursor >= toMin) break;
  }
  if (cursor < toMin) free.push({ startMin: cursor, endMin: toMin });
  return free.filter((w) => w.endMin - w.startMin >= Math.max(1, minLength));
}

export type SlotError =
  | 'start_out_of_range'
  | 'end_out_of_range'
  | 'too_short'
  | 'no_days'
  | 'invalid_day'
  | 'duplicate_day'
  | 'invalid_date';

/** Vérifie un créneau avant de l'enregistrer ou d'appliquer une proposition de l'IA. */
export function validateSlot(slot: Slot): SlotError[] {
  const errors: SlotError[] = [];
  const startOk = isValidMinute(slot.startMin);
  const endOk = isValidMinute(slot.endMin);
  if (!startOk) errors.push('start_out_of_range');
  if (!endOk) errors.push('end_out_of_range');
  if (startOk && endOk && durationMin(slot.startMin, slot.endMin) < MIN_SLOT_DURATION) {
    errors.push('too_short');
  }
  if (slot.once) {
    if (!isDateKey(slot.once)) errors.push('invalid_date');
    return errors;
  }
  if (slot.days.length === 0) errors.push('no_days');
  if (slot.days.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) errors.push('invalid_day');
  if (new Set(slot.days).size !== slot.days.length) errors.push('duplicate_day');
  return errors;
}
