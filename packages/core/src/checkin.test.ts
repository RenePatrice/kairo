import { describe, expect, it } from 'vitest';
import {
  checkKey,
  dayStats,
  firstCheckDay,
  isPerfectDay,
  pendingCheckIns,
  rowState,
  streak,
  type CheckMap,
  type HistoryContext,
  weekDoneMinutes,
} from './checkin';
import { addDays, dateKey } from './dates';
import { occurrencesOn, type Slot } from './schedule';

const daily: Slot[] = [
  { id: 'a', days: [0, 1, 2, 3, 4, 5, 6], startMin: 480, endMin: 540 },
  { id: 'b', days: [0, 1, 2, 3, 4, 5, 6], startMin: 1080, endMin: 1140 },
];
const NOW = new Date(2026, 10, 23, 12); // lundi midi
const ctx = (checks: CheckMap, rest: string[] = []): HistoryContext => ({
  checks,
  restDays: new Set(rest),
  since: firstCheckDay(checks),
});
function doneDays(n: number, from = 1): Record<string, 'done'> {
  const c: Record<string, 'done'> = {};
  for (let i = from; i < from + n; i++) {
    const k = dateKey(addDays(NOW, -i));
    c[checkKey(k, 'a')] = 'done';
    c[checkKey(k, 'b')] = 'done';
  }
  return c;
}

describe('check-in', () => {
  it('construit les clés et trouve le premier jour', () => {
    expect(checkKey('2026-11-23', 'a')).toBe('2026-11-23|a');
    expect(firstCheckDay({})).toBeNull();
    expect(firstCheckDay({ '2026-11-20|a': 'done', '2026-11-18|b': 'missed' })).toBe('2026-11-18');
  });

  it('compte ce qui était dû et fait', () => {
    const c = { '2026-11-23|a': 'done' } as const;
    expect(dayStats(daily, NOW, ctx(c), 720)).toEqual({ due: 1, done: 1, ratio: 1 });
    expect(dayStats(daily, NOW, ctx(c))).toEqual({ due: 2, done: 1, ratio: 0.5 });
    expect(dayStats(daily, NOW, ctx(c), 400).ratio).toBeNull();
  });

  it('ne compte ni les journées off ni les jours avant le premier check-in', () => {
    const c = { '2026-11-22|a': 'done' } as const;
    expect(dayStats(daily, NOW, ctx(c, ['2026-11-23'])).ratio).toBeNull();
    expect(dayStats(daily, new Date(2026, 10, 20), ctx(c)).ratio).toBeNull();
  });

  it('calcule la série en cours et le record', () => {
    expect(streak(daily, NOW, ctx(doneDays(3)))).toEqual({ current: 3, best: 3 });
    const withGap = { ...doneDays(2), ...doneDays(5, 4) };
    expect(streak(daily, NOW, ctx(withGap))).toEqual({ current: 2, best: 5 });
    expect(streak(daily, NOW, ctx({}))).toEqual({ current: 0, best: 0 });
  });

  it('ne casse pas la série si aujourd’hui n’est pas encore validé', () => {
    const c = { ...doneDays(2), [checkKey('2026-11-23', 'a')]: 'missed' as const };
    expect(streak(daily, NOW, ctx(c)).current).toBe(2);
  });

  it('une journée off protège la série', () => {
    const c = { ...doneDays(1), ...doneDays(1, 3) };
    expect(streak(daily, NOW, ctx(c, [dateKey(addDays(NOW, -2))])).current).toBe(2);
  });

  it('donne l’état de chaque ligne du jour', () => {
    const [a, b] = occurrencesOn(daily, NOW);
    if (!a || !b) throw new Error('créneaux attendus');
    expect(rowState(a, {}, NOW)).toBe('due');
    expect(rowState(b, {}, NOW)).toBe('upcoming');
    expect(rowState(a, { '2026-11-23|a': 'missed' }, NOW)).toBe('missed');
    expect(rowState(a, {}, new Date(2026, 10, 23, 8, 30))).toBe('current');
  });

  it('liste les check-ins en attente', () => {
    const occ = occurrencesOn(daily, NOW);
    expect(pendingCheckIns(occ, {}, NOW).map((o) => o.slot.id)).toEqual(['a']);
    expect(pendingCheckIns(occ, { '2026-11-23|a': 'done' }, NOW)).toEqual([]);
  });

  it('reconnaît une journée parfaite', () => {
    expect(isPerfectDay(daily, NOW, { '2026-11-23|a': 'done', '2026-11-23|b': 'done' })).toBe(true);
    expect(isPerfectDay(daily, NOW, { '2026-11-23|a': 'done' })).toBe(false);
    expect(isPerfectDay([], NOW, {})).toBe(false);
  });
});

describe('heures validées de la semaine', () => {
  it('additionne les créneaux faits, par activité', () => {
    const monday = new Date(2026, 10, 23);
    const c = { '2026-11-23|a': 'done', '2026-11-24|a': 'done', '2026-11-24|b': 'missed' } as const;
    expect(weekDoneMinutes(daily, monday, c)).toBe(120);
    expect(weekDoneMinutes(daily, monday, c, (s) => s.id === 'b')).toBe(0);
  });
});
