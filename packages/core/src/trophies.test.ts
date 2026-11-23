import { describe, expect, it } from 'vitest';
import { NOW, PREV_MONDAY, SLOTS, makeHistory } from './__fixtures__/history';
import { weekKey } from './dates';
import { TROPHY_IDS, newTrophies, trophyState, type TrophyInput } from './trophies';

const input = (over: Partial<TrophyInput> = {}): TrophyInput => ({
  slots: SLOTS,
  history: makeHistory(),
  now: NOW,
  weekGoals: {},
  weekKeyOf: weekKey,
  focusCount: 0,
  reviewCount: 0,
  ...over,
});

describe('trophyState', () => {
  it('débloque selon l’historique', () => {
    expect(trophyState(input())).toEqual({
      first: true,
      streak3: true,
      streak7: false,
      streak30: false,
      perfectDay: true,
      goalWeek: false,
      h10: true,
      h50: false,
      h100: false,
      focus5: false,
      reviewer: false,
      early: false,
      night: false,
      rest: false,
    });
  });

  it('lève-tôt, oiseau de nuit, focus, bilans et journée off', () => {
    const slots = [
      { id: 'e', categoryId: 'x', days: [0], startMin: 420, endMin: 450 },
      { id: 'n', categoryId: 'x', days: [0], startMin: 1350, endMin: 1380 },
    ];
    const history = {
      checks: {
        '2026-11-16|e': 'done',
        '2026-11-16|n': 'done',
        '2026-11-16|gone': 'done',
        '2026-11-09|e': 'missed',
      } as const,
      restDays: new Set(['2026-11-18']),
    };
    const t = trophyState(input({ slots, history, focusCount: 5, reviewCount: 7 }));
    expect(t).toMatchObject({ early: true, night: true, focus5: true, reviewer: true, rest: true });
  });

  it('cap tenu : objectif d’heures, de régularité ou d’activité des semaines passées', () => {
    const key = weekKey(PREV_MONDAY);
    expect(
      trophyState(input({ weekGoals: { [key]: { kind: 'hours', target: 10 } } })).goalWeek,
    ).toBe(true);
    expect(
      trophyState(input({ weekGoals: { [key]: { kind: 'rate', target: 95 } } })).goalWeek,
    ).toBe(false);
    expect(
      trophyState(input({ weekGoals: { [key]: { kind: 'act', target: 6, categoryId: 'y' } } }))
        .goalWeek,
    ).toBe(true);
    expect(
      trophyState(input({ slots: [], weekGoals: { [key]: { kind: 'rate', target: 0 } } })).goalWeek,
    ).toBe(false);
  });
});

describe('newTrophies', () => {
  it('ne garde que les trophées gagnés pas encore vus, dans l’ordre', () => {
    const state = Object.fromEntries(
      TROPHY_IDS.map((id) => [id, ['first', 'h10', 'rest'].includes(id)]),
    ) as Record<(typeof TROPHY_IDS)[number], boolean>;
    expect(newTrophies(state, ['h10'])).toEqual(['first', 'rest']);
  });
});
