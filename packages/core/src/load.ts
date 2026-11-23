/**
 * Moments libres proposés par l'assistant (« Voici tes moments libres aujourd'hui ») et alertes
 * de charge : journée plus remplie que le temps d'éveil, nuit de moins de 7 h.
 */
import { addDays } from './dates';
import { awakeMinutes, dayAnchor, sleepMinutes, type Rhythm } from './rhythm';
import { occurrencesOn, type Slot } from './schedule';
import { MINUTES_PER_DAY } from './time';
import { dayLoad } from './week';

/**
 * Trous d'au moins `need` minutes entre `fromMin` et le coucher, alignés au quart d'heure.
 * Les heures sont ancrées sur la journée (elles peuvent dépasser 1440 après minuit).
 */
export function freeSlotsFrom(
  slots: readonly Slot[],
  date: Date,
  rhythm: Rhythm,
  need: number,
  fromMin: number,
): Array<{ startMin: number; endMin: number }> {
  const busy = occurrencesOn(slots, date)
    .map((o) => {
      const s = dayAnchor(o.startMin, rhythm);
      return [s, s + o.durationMin] as const;
    })
    .sort((a, b) => a[0] - b[0]);
  const limit = rhythm.wakeMin + awakeMinutes(rhythm);
  let cursor = Math.max(dayAnchor(fromMin, rhythm), rhythm.wakeMin);
  const out: Array<{ startMin: number; endMin: number }> = [];
  for (const [from, to] of [...busy, [limit, limit] as const]) {
    const g0 = Math.ceil(cursor / 15) * 15;
    const g1 = Math.min(from, limit);
    if (g1 - g0 >= need) out.push({ startMin: g0, endMin: g1 });
    cursor = Math.max(cursor, to);
  }
  return out;
}

/** Sommeil minimal conseillé (cahier : alerte si moins de 7 h). */
export const MIN_SLEEP_MIN = 420;

/** Index (0..6) des jours de la semaine dont les créneaux dépassent le temps d'éveil. */
export function overloadedDays(slots: readonly Slot[], weekStart: Date, rhythm: Rhythm): number[] {
  const awake = awakeMinutes(rhythm);
  return Array.from({ length: 7 }, (_, i) => i).filter(
    (i) => dayLoad(slots, addDays(weekStart, i)) > awake,
  );
}

/** Minutes de sommeil restantes la nuit qui suit `date`, une fois retirés les créneaux. */
export function nightSleep(slots: readonly Slot[], date: Date, rhythm: Rhythm): number {
  const start =
    rhythm.sleepMin >= rhythm.wakeMin ? rhythm.sleepMin : rhythm.sleepMin + MINUTES_PER_DAY;
  const end = start + sleepMinutes(rhythm);
  const busy = [
    ...occurrencesOn(slots, date).map((o) => [o.startMin, o.startMin + o.durationMin] as const),
    ...occurrencesOn(slots, addDays(date, 1)).map(
      (o) => [o.startMin + MINUTES_PER_DAY, o.startMin + o.durationMin + MINUTES_PER_DAY] as const,
    ),
  ]
    .map(([a, b]) => [Math.max(a, start), Math.min(b, end)] as const)
    .filter(([a, b]) => b > a)
    .sort((x, y) => x[0] - y[0]);
  let taken = 0;
  let cursor = start;
  for (const [a, b] of busy) {
    if (b <= cursor) continue;
    taken += b - Math.max(a, cursor);
    cursor = b;
  }
  return end - start - taken;
}

/** Index (0..6) des jours suivis d'une nuit de moins de 7 h. */
export function shortSleepDays(slots: readonly Slot[], weekStart: Date, rhythm: Rhythm): number[] {
  return Array.from({ length: 7 }, (_, i) => i).filter(
    (i) => nightSleep(slots, addDays(weekStart, i), rhythm) < MIN_SLEEP_MIN,
  );
}
