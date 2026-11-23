import { describe, expect, it } from 'vitest';
import { demoExtras, demoHistory, stableRandom } from './demo';

describe('données de démo', () => {
  it('donne un hasard stable', () => {
    expect(stableRandom('a')).toBe(stableRandom('a'));
    expect(stableRandom('a')).not.toBe(stableRandom('b'));
    expect(stableRandom('x')).toBeGreaterThanOrEqual(0);
    expect(stableRandom('x')).toBeLessThan(1);
  });

  it('simule 8 semaines de check-ins, sans les créneaux ponctuels', () => {
    const slots = [
      { id: 'a', days: [0, 1, 2, 3, 4, 5, 6], startMin: 480, endMin: 540 },
      { id: 'b', days: [], startMin: 600, endMin: 660, once: '2026-11-20' },
    ];
    const h = demoHistory(slots, new Date(2026, 10, 23));
    const keys = Object.keys(h);
    expect(keys).toHaveLength(55);
    expect(keys.every((k) => k.endsWith('|a'))).toBe(true);
    expect(h['2026-11-23|a']).toBeUndefined();
    const done = Object.values(h).filter((v) => v === 'done').length;
    expect(done).toBeGreaterThan(30);
    expect(done).toBeLessThan(55);
  });
});

describe('demoExtras', () => {
  const now = new Date('2026-11-23T10:30:00+01:00');
  const slots = [
    { id: 'a', days: [0, 1, 2, 3, 4, 5, 6], startMin: 540, endMin: 600 },
    { id: 'p', days: [0, 1, 2, 3, 4, 5, 6], startMin: 840, endMin: 900 },
    { id: 'b', days: [0, 1, 2, 3, 4, 5, 6], startMin: 1080, endMin: 1140 },
  ];
  const checks = demoHistory(slots, now);
  const extras = demoExtras(slots, now, checks);

  it('note l’énergie de créneaux faits, selon le moment', () => {
    const keys = Object.keys(extras.energy);
    expect(keys.length).toBeGreaterThan(20);
    for (const k of keys) {
      expect(checks[k]).toBe('done');
      const level = extras.energy[k];
      if (k.endsWith('|a')) expect([2, 3]).toContain(level);
      if (k.endsWith('|p')) expect(level).toBe(2);
      if (k.endsWith('|b')) expect([1, 2]).toContain(level);
    }
  });

  it('ajoute humeurs, objectifs du jour et de la semaine, de façon stable', () => {
    expect(extras.reviews.filter((r) => r.key.startsWith('D'))).toHaveLength(13);
    expect(extras.reviews.filter((r) => r.key.startsWith('W')).map((r) => r.mood)).toEqual([
      4, 3, 3,
    ]);
    expect(extras.dayGoals.every((g) => g.target === 3)).toBe(true);
    expect(extras.weekGoals).toHaveLength(7);
    expect(extras.weekGoals[0]?.target).toBe(17);
    expect(demoExtras(slots, now, checks)).toEqual(extras);
  });

  it('sans créneau : seulement les objectifs de semaine minimaux', () => {
    const empty = demoExtras([], now, {});
    expect(empty).toMatchObject({ energy: {}, dayGoals: [] });
    expect(empty.weekGoals.every((g) => g.target === 1)).toBe(true);
  });
});
