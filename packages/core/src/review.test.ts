import { describe, expect, it } from 'vitest';
import { NOW, PREV_MONDAY, SLOTS, makeHistory } from './__fixtures__/history';
import { weekKey } from './dates';
import { autoReviewsDue, dayReview, moodFrom, weekReview, type ReviewInput } from './review';

const input = (over: Partial<ReviewInput> = {}): ReviewInput => ({
  slots: SLOTS,
  history: makeHistory(),
  energy: {},
  now: NOW,
  ...over,
});
const friday20 = new Date('2026-11-20T12:00:00+01:00');

describe('moodFrom', () => {
  it('suit le taux, corrigé par l’énergie', () => {
    expect([0.95, 0.75, 0.55, 0.3, 0.1].map((r) => moodFrom(r, 0))).toEqual([5, 4, 3, 2, 1]);
    expect(moodFrom(0.75, 1.2)).toBe(3);
    expect(moodFrom(0.3, 1.2)).toBe(2);
    expect(moodFrom(0.75, 2.8)).toBe(5);
    expect(moodFrom(0.55, 2.8)).toBe(3);
  });
});

describe('dayReview', () => {
  it('résume une journée avec un créneau raté', () => {
    const r = dayReview(friday20, input({ energy: { '2026-11-20|a': 1 } }), {
      kind: 'blocks',
      target: 1,
    });
    expect(r).toEqual({
      mood: 2,
      ratio: 0.5,
      done: 1,
      due: 2,
      doneMin: 60,
      average7: 5.5 / 7,
      energy: 1,
      goalReached: true,
      doneCategoryIds: ['x'],
      missedCategoryIds: ['y'],
      firstMissedStart: 1080,
      advice: 'catch_up',
    });
    expect(dayReview(friday20, input(), { kind: 'hours', target: 2 }).goalReached).toBe(false);
    expect(dayReview(friday20, input(), { kind: 'free', target: 0 }).goalReached).toBeNull();
  });

  it('aujourd’hui, ne compte que les créneaux terminés ; énergie basse = conseil sommeil', () => {
    const r = dayReview(NOW, input({ energy: { '2026-11-23|a': 1 } }));
    expect(r).toMatchObject({ due: 1, done: 1, ratio: 1, advice: 'low_energy' });
  });

  it('journée tenue : garder le rythme', () => {
    const r = dayReview(new Date('2026-11-22T12:00:00+01:00'), input());
    expect(r).toMatchObject({ mood: 5, ratio: 1, advice: 'keep', missedCategoryIds: [] });
  });

  it('journée vide : humeur neutre, sans moyenne', () => {
    const r = dayReview(NOW, input({ slots: [], history: { checks: {}, restDays: new Set() } }));
    expect(r).toMatchObject({ mood: 3, ratio: 0, due: 0, average7: null, firstMissedStart: null });
  });
});

describe('weekReview', () => {
  it('fait le bilan d’une bonne semaine avec un jour fragile', () => {
    const r = weekReview(PREV_MONDAY, input({ energy: { '2026-11-17|a': 3, '2026-11-18|a': 3 } }), {
      kind: 'rate',
      target: 90,
    });
    expect(r).toEqual({
      mood: 5,
      ratio: 13 / 14,
      totalMin: 780,
      previousRatio: 0.5,
      bestDay: 0,
      worstDay: 4,
      worstRatio: 0.5,
      strong: { categoryId: 'x', doneMin: 420 },
      weak: null,
      energy: 'high',
      goalReached: true,
      advice: 'fragile_day',
      nextGoal: { kind: 'rate', target: 100, focus: 'raise' },
    });
  });

  it('vérifie les objectifs d’heures et d’activité', () => {
    expect(weekReview(PREV_MONDAY, input(), { kind: 'hours', target: 13 }).goalReached).toBe(true);
    expect(
      weekReview(PREV_MONDAY, input(), { kind: 'act', target: 7, categoryId: 'y' }).goalReached,
    ).toBe(false);
    expect(weekReview(PREV_MONDAY, input(), { kind: 'act', target: 1 }).goalReached).toBe(false);
    expect(weekReview(PREV_MONDAY, input()).goalReached).toBeNull();
  });

  it('propose de remettre sur les rails l’activité qui décroche', () => {
    const r = weekReview(
      new Date('2026-11-11T12:00:00+01:00'),
      input({ energy: { '2026-11-12|a': 1 } }),
    );
    expect(r).toMatchObject({
      ratio: 0.5,
      previousRatio: null,
      weak: { categoryId: 'y', ratio: 0 },
      advice: 'weak_activity',
      energy: 'low',
      nextGoal: { kind: 'act', categoryId: 'y', target: 6, focus: 'activity' },
    });
  });

  it('semaine en cours : s’arrête à aujourd’hui ; énergie stable ; semaine solide', () => {
    const r = weekReview(NOW, input({ energy: { '2026-11-23|a': 2 } }));
    // Comme la maquette, le prévu compte aussi « b » de ce soir : « y » décroche déjà.
    expect(r).toMatchObject({ ratio: 1, totalMin: 60, energy: 'stable', advice: 'weak_activity' });
    const solo = weekReview(NOW, input({ slots: SLOTS.slice(0, 1) }));
    expect(solo).toMatchObject({ weak: null, advice: 'solid' });
  });

  it('semaine sans rien de prévu', () => {
    const r = weekReview(NOW, input({ slots: [] }));
    expect(r).toMatchObject({
      mood: 3,
      strong: null,
      bestDay: null,
      worstRatio: null,
      energy: null,
    });
  });
});

describe('autoReviewsDue', () => {
  it('rédige les jours passés avec check-ins et la semaine passée', () => {
    const plan = autoReviewsDue(input(), new Set(['D2026-11-22']), weekKey);
    expect(plan.days).toEqual([
      '2026-11-21',
      '2026-11-20',
      '2026-11-19',
      '2026-11-18',
      '2026-11-17',
      '2026-11-16',
    ]);
    expect(plan.weeks.map((w) => w.key)).toEqual([weekKey(PREV_MONDAY)]);
  });

  it('le dimanche soir : le jour même après 23 h et la semaine en cours après 21 h', () => {
    const late = new Date('2026-11-22T23:30:00+01:00');
    const plan = autoReviewsDue(input({ now: late }), new Set([weekKey(late)]), weekKey);
    expect(plan.days[0]).toBe('2026-11-22');
    expect(plan.weeks.map((w) => w.key)).toEqual([weekKey(new Date('2026-11-15T12:00:00+01:00'))]);
    const sunday21 = new Date('2026-11-22T21:30:00+01:00');
    expect(autoReviewsDue(input({ now: sunday21 }), new Set(), weekKey).weeks).toHaveLength(2);
  });

  it('rien sans créneau ni check-in', () => {
    const plan = autoReviewsDue(
      { slots: [], history: { checks: {}, restDays: new Set() }, now: NOW },
      new Set(),
      weekKey,
    );
    expect(plan).toEqual({ days: [], weeks: [] });
  });
});
