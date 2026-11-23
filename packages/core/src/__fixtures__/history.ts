import { checkKey, firstCheckDay, type CheckMap, type HistoryContext } from '../checkin';
import { addDays, dateKey } from '../dates';
import type { CategorySlot } from '../stats';

/** Lundi 23 novembre 2026, 10 h 30 (Europe/Paris). */
export const NOW = new Date('2026-11-23T10:30:00+01:00');
export const MONDAY = new Date('2026-11-23T00:00:00+01:00');
export const PREV_MONDAY = new Date('2026-11-16T00:00:00+01:00');

/** « a » : x tous les jours 9 h–10 h ; « b » : y tous les jours 18 h–19 h. */
export const SLOTS: CategorySlot[] = [
  { id: 'a', categoryId: 'x', days: [0, 1, 2, 3, 4, 5, 6], startMin: 540, endMin: 600 },
  { id: 'b', categoryId: 'y', days: [0, 1, 2, 3, 4, 5, 6], startMin: 1080, endMin: 1140 },
];

/**
 * Historique :
 * - aujourd'hui (23 nov.) : a fait ;
 * - 16 → 22 nov. : a et b faits, sauf b raté le vendredi 20 ;
 * - 10 → 15 nov. : a fait, b jamais validé.
 */
export function makeChecks(): CheckMap {
  const checks: Record<string, 'done' | 'missed'> = { [checkKey('2026-11-23', 'a')]: 'done' };
  for (let i = 1; i <= 13; i++) {
    const k = dateKey(addDays(MONDAY, -i));
    checks[checkKey(k, 'a')] = 'done';
    if (i <= 7) checks[checkKey(k, 'b')] = i === 3 ? 'missed' : 'done';
  }
  return checks;
}

export function makeHistory(restDays: string[] = []): HistoryContext {
  const checks = makeChecks();
  return { checks, restDays: new Set(restDays), since: firstCheckDay(checks) };
}
