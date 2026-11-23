import { describe, expect, it } from 'vitest';
import { MONDAY, NOW, PREV_MONDAY, SLOTS, makeHistory } from './__fixtures__/history';
import {
  activityWeek,
  dailyHistory,
  dayGoalProgress,
  energyByMoment,
  heatmap,
  momentOf,
  momentum,
  rateBetween,
  weekBars,
  weekGoalProgress,
  weekInsight,
  weekdayRates,
  type ActivityWeek,
} from './stats';

const daily = () => dailyHistory(SLOTS, NOW, makeHistory());

describe('régularité', () => {
  it('compte aujourd’hui jusqu’à maintenant seulement', () => {
    const d = daily();
    expect(d).toHaveLength(56);
    expect(d[0]?.stats).toEqual({ due: 1, done: 1, ratio: 1 });
    expect(d[3]?.stats).toEqual({ due: 2, done: 1, ratio: 0.5 });
  });

  it('calcule la régularité sur 7 jours et la tendance en points', () => {
    expect(momentum(daily())).toEqual({ current: 12 / 13, previous: 8 / 14, trend: 35 });
  });

  it('ignore les jours avant le premier check-in et renvoie null sans donnée', () => {
    expect(rateBetween(daily(), 20, 30)).toBeNull();
    expect(momentum(dailyHistory([], NOW, makeHistory()))).toEqual({
      current: null,
      previous: null,
      trend: null,
    });
  });

  it('trace les 8 dernières semaines, de la plus ancienne à la semaine en cours', () => {
    expect(weekBars(daily(), NOW)).toEqual([null, null, null, null, null, 0.5, 13 / 14, 1]);
  });

  it('dessine 5 semaines de carte de chaleur, aujourd’hui sur la dernière ligne', () => {
    const cells = heatmap(SLOTS, NOW, makeHistory());
    expect(cells).toHaveLength(35);
    expect(cells[0]?.day).toBe('2026-10-26');
    expect(cells[28]).toEqual({ day: '2026-11-23', future: false, today: true, ratio: 1 });
    expect(cells[29]).toMatchObject({ future: true, ratio: null });
    expect(cells[24]).toMatchObject({ day: '2026-11-19', ratio: 1 });
  });

  it('donne le taux par jour de la semaine', () => {
    const rates = weekdayRates(daily());
    expect(rates[0]).toBe(1); // lundis : 23 (1/1) et 16 (2/2)
    expect(rates[4]).toBe(0.5); // vendredis : 20 (1/2) et 13 (1/2, b jamais validé)
    expect(rates[1]).toBe(0.75); // mardis : 17 (2/2) et 10 (1/2)
  });
});

describe('activités et énergie', () => {
  it('compare réalisé, prévu et objectif par activité', () => {
    const week = activityWeek(
      SLOTS,
      [
        { id: 'x', weeklyGoalH: 5 },
        { id: 'y', weeklyGoalH: 0 },
        { id: 'z', weeklyGoalH: 0 },
      ],
      PREV_MONDAY,
      makeHistory().checks,
    );
    expect(week).toEqual([
      { categoryId: 'x', plannedMin: 420, doneMin: 420, goalMin: 300, ratio: 1.4 },
      { categoryId: 'y', plannedMin: 420, doneMin: 360, goalMin: 0, ratio: 360 / 420 },
      { categoryId: 'z', plannedMin: 0, doneMin: 0, goalMin: 0, ratio: 0 },
    ]);
  });

  it('range l’énergie par moment de la journée', () => {
    expect(momentOf(719)).toBe('morning');
    expect(momentOf(720)).toBe('afternoon');
    expect(momentOf(1080)).toBe('evening');
    expect(
      energyByMoment(
        { '2026-11-22|a': 3, '2026-11-21|a': 2, '2026-11-22|b': 1, '2026-11-22|ghost': 3 },
        SLOTS,
      ),
    ).toEqual({ morning: 2.5, afternoon: 0, evening: 1 });
  });
});

describe('weekInsight', () => {
  const acts: ActivityWeek[] = [
    { categoryId: 'x', plannedMin: 420, doneMin: 420, goalMin: 0, ratio: 1 },
    { categoryId: 'y', plannedMin: 420, doneMin: 120, goalMin: 0, ratio: 0.29 },
    { categoryId: 'z', plannedMin: 0, doneMin: 0, goalMin: 0, ratio: 0 },
  ];

  it('repère le point fort, l’activité qui décroche, les jours et le meilleur moment', () => {
    expect(weekInsight(acts, daily(), { morning: 1, afternoon: 0, evening: 2.5 }, true)).toEqual({
      strongId: 'x',
      weakId: 'y',
      bestDay: 0,
      worstDay: 4,
      bestMoment: 'evening',
    });
  });

  it('ne signale rien sans historique, et pas de décrochage au-dessus de 70 %', () => {
    expect(weekInsight(acts, daily(), { morning: 0, afternoon: 0, evening: 0 }, false)).toBeNull();
    expect(weekInsight([], daily(), { morning: 0, afternoon: 0, evening: 0 }, true)).toBeNull();
    const fine = acts.map((a) => ({ ...a, ratio: Math.max(a.ratio, 0.8) }));
    expect(
      weekInsight(fine.slice(0, 2), daily(), { morning: 0, afternoon: 0, evening: 0 }, true),
    ).toMatchObject({ weakId: null, bestMoment: null });
  });
});

describe('objectifs', () => {
  it('mesure l’objectif du jour', () => {
    expect(dayGoalProgress({ kind: 'blocks', target: 2 }, { minutes: 60, count: 1 })).toBe(0.5);
    expect(dayGoalProgress({ kind: 'hours', target: 2 }, { minutes: 90, count: 1 })).toBe(0.75);
    expect(dayGoalProgress({ kind: 'hours', target: 0 }, { minutes: 60, count: 1 })).toBe(2);
    expect(dayGoalProgress({ kind: 'free', target: 0 }, { minutes: 60, count: 1 })).toBeNull();
    expect(dayGoalProgress(undefined, { minutes: 60, count: 1 })).toBeNull();
  });

  it('suit un objectif de régularité', () => {
    const p = weekGoalProgress({ kind: 'rate', target: 80 }, SLOTS, MONDAY, NOW, makeHistory());
    expect(p).toEqual({ value: 100, status: 'above', points: [{ day: 0, value: 100 }] });
    const low = weekGoalProgress(
      { kind: 'rate', target: 95 },
      SLOTS,
      PREV_MONDAY,
      new Date('2026-11-22T20:00:00+01:00'),
      makeHistory(),
    );
    expect(low.status).toBe('below');
    expect(low.value).toBeCloseTo((13 / 14) * 100);
    expect(low.points).toHaveLength(7);
  });

  it('suit un objectif d’heures : atteint, en avance, dans les temps, en retard', () => {
    const sunday = new Date('2026-11-22T20:00:00+01:00');
    const wednesday = new Date('2026-11-18T20:00:00+01:00');
    const h = makeHistory();
    const status = (target: number, now: Date, kind: 'hours' | 'act' = 'hours') =>
      weekGoalProgress({ kind, target, categoryId: 'y' }, SLOTS, PREV_MONDAY, now, h);
    expect(status(10, sunday)).toMatchObject({ value: 13, status: 'reached' });
    expect(status(14, wednesday)).toMatchObject({ value: 6, status: 'ahead' });
    expect(status(14, sunday).status).toBe('on_track');
    expect(status(20, sunday).status).toBe('behind');
    expect(status(7, sunday, 'act')).toMatchObject({ value: 6, status: 'on_track' });
  });

  it('suit un objectif de régularité sans rien de dû', () => {
    const p = weekGoalProgress({ kind: 'rate', target: 50 }, [], MONDAY, NOW, makeHistory());
    expect(p).toEqual({ value: 0, status: 'below', points: [] });
  });
});
