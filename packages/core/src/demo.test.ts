import { describe, expect, it } from 'vitest';
import { demoHistory, stableRandom } from './demo';

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
