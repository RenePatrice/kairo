import { describe, expect, it } from 'vitest';
import { hourTicks, minuteToAngle, sleepArc, slotArc } from './dial';

describe('cadran', () => {
  it('convertit une heure en angle', () => {
    expect(minuteToAngle(0)).toBe(0);
    expect(minuteToAngle(360)).toBe(90);
    expect(minuteToAngle(1080)).toBe(270);
  });

  it('trace l’arc d’un créneau avec un espace', () => {
    expect(slotArc(360, 60)).toEqual([[91.2, 103.8]]);
    expect(slotArc(360, 60, 0)).toEqual([[90, 105]]);
  });

  it('coupe un arc qui passe minuit', () => {
    const [a, b] = slotArc(1380, 120, 0);
    expect(a).toEqual([345, 359.9]);
    expect(b?.[0]).toBe(0.1);
    expect(b?.[1]).toBeCloseTo(15);
  });

  it('ignore un créneau trop court pour être dessiné', () => {
    expect(slotArc(600, 5)).toEqual([]);
  });

  it('trace le sommeil', () => {
    const night = sleepArc({ wakeMin: 420, sleepMin: 1410 });
    expect(night).toHaveLength(2);
    expect(night[0]?.[0]).toBe(353.5);
    const day = sleepArc({ wakeMin: 1080, sleepMin: 480 });
    expect(day).toEqual([[121, 269]]);
    expect(sleepArc({ wakeMin: 0, sleepMin: 1439 })).toEqual([]);
  });

  it('marque les heures 0, 6, 12, 18', () => {
    const ticks = hourTicks();
    expect(ticks).toHaveLength(24);
    expect(ticks.filter((t) => t.major).map((t) => t.hour)).toEqual([0, 6, 12, 18]);
  });
});
