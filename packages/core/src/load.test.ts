import { describe, expect, it } from 'vitest';
import { MONDAY, SLOTS } from './__fixtures__/history';
import { freeSlotsFrom, nightSleep, overloadedDays, shortSleepDays } from './load';

const rhythm = { wakeMin: 420, sleepMin: 1410 };

describe('freeSlotsFrom', () => {
  it('donne les trous du reste de la journée, au quart d’heure', () => {
    expect(freeSlotsFrom(SLOTS, MONDAY, rhythm, 45, 637)).toEqual([
      { startMin: 645, endMin: 1080 },
      { startMin: 1140, endMin: 1410 },
    ]);
  });

  it('part du réveil le matin et ignore les trous trop courts', () => {
    expect(freeSlotsFrom(SLOTS, MONDAY, rhythm, 150, 300)).toEqual([
      { startMin: 600, endMin: 1080 },
      { startMin: 1140, endMin: 1410 },
    ]);
    expect(freeSlotsFrom(SLOTS, MONDAY, rhythm, 500, 600)).toEqual([]);
  });

  it('range un créneau après minuit en fin de journée', () => {
    const late = [{ id: 'l', days: [0], startMin: 1380, endMin: 30 }];
    expect(freeSlotsFrom(late, MONDAY, rhythm, 30, 1300)).toEqual([
      { startMin: 1305, endMin: 1380 },
    ]);
  });
});

describe('alertes de charge', () => {
  it('signale un jour plus rempli que le temps d’éveil', () => {
    const big = [{ id: 'big', days: [0], startMin: 360, endMin: 1439 }];
    expect(overloadedDays(big, MONDAY, rhythm)).toEqual([0]);
    expect(overloadedDays(SLOTS, MONDAY, rhythm)).toEqual([]);
  });

  it('mesure la nuit qui reste, créneaux du soir et du lendemain matin retirés', () => {
    expect(nightSleep([], MONDAY, rhythm)).toBe(450);
    const slots = [
      { id: 'late', days: [1], startMin: 1380, endMin: 60 },
      { id: 'inside', days: [1], startMin: 1425, endMin: 0 },
      { id: 'early', days: [2], startMin: 360, endMin: 420 },
    ];
    expect(nightSleep(slots, new Date('2026-11-24T00:00:00+01:00'), rhythm)).toBe(300);
    expect(shortSleepDays(slots, MONDAY, rhythm)).toEqual([1]);
  });

  it('gère un coucher après minuit', () => {
    expect(nightSleep([], MONDAY, { wakeMin: 540, sleepMin: 60 })).toBe(480);
    expect(shortSleepDays([], MONDAY, { wakeMin: 360, sleepMin: 0 })).toEqual([
      0, 1, 2, 3, 4, 5, 6,
    ]);
  });
});
