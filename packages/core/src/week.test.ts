import { describe, expect, it } from 'vitest';
import { DEFAULT_RHYTHM } from './rhythm';
import type { Slot } from './schedule';
import {
  copyDay,
  dayLoad,
  daysPreset,
  draftOverlaps,
  findFreeStart,
  overviewSegments,
  recurringOn,
  weekDates,
  weekLoads,
  weekMinutesFor,
  weekMix,
  weekWindow,
} from './week';

interface S extends Slot {
  act: string;
}
const MON = new Date(2026, 10, 23);
const slots: S[] = [
  { id: 'a', act: 'cours', days: [0, 1, 2, 3, 4], startMin: 540, endMin: 720 },
  { id: 'b', act: 'sport', days: [1, 3], startMin: 1080, endMin: 1140 },
  { id: 'c', act: 'jeux', days: [], startMin: 1380, endMin: 90, once: '2026-11-28' },
];

describe('semaine', () => {
  it('liste les 7 jours', () => {
    expect(weekDates(MON).map((d) => d.getDate())).toEqual([23, 24, 25, 26, 27, 28, 29]);
  });

  it('calcule la charge de chaque jour', () => {
    expect(dayLoad(slots, MON)).toBe(180);
    expect(weekLoads(slots, MON)).toEqual([180, 240, 180, 240, 180, 150, 0]);
  });

  it('élargit la fenêtre aux créneaux tardifs, arrondie à l’heure', () => {
    expect(weekWindow([], DEFAULT_RHYTHM)).toEqual({ start: 420, end: 1440, span: 1020 });
    expect(weekWindow(slots, DEFAULT_RHYTHM)).toEqual({ start: 420, end: 1560, span: 1140 });
    expect(
      weekWindow([{ id: 'x', days: [0], startMin: 300, endMin: 330 }], DEFAULT_RHYTHM).start,
    ).toBe(300);
  });

  it('place les segments de la vue d’ensemble en pourcentages', () => {
    const win = { start: 420, end: 1440, span: 1020 };
    const segs = overviewSegments(slots, new Date(2026, 10, 24), win, DEFAULT_RHYTHM);
    expect(segs.map((s) => s.slot.id)).toEqual(['a', 'b']);
    expect(segs[0]?.left).toBeCloseTo(11.76, 1);
    expect(segs[0]?.width).toBeCloseTo(17.65, 1);
    const sat = overviewSegments(slots, new Date(2026, 10, 28), win, DEFAULT_RHYTHM);
    expect(sat[0]?.width).toBeCloseTo((60 / 1020) * 100, 3);
    const tiny = { start: 600, end: 660, span: 60 };
    expect(overviewSegments(slots, new Date(2026, 10, 24), tiny, DEFAULT_RHYTHM)).toHaveLength(1);
  });

  it('répartit la semaine par activité', () => {
    const mix = weekMix(slots, MON, (s) => s.act);
    expect(mix.map((m) => [m.key, m.minutes])).toEqual([
      ['cours', 900],
      ['jeux', 150],
      ['sport', 120],
    ]);
    expect(mix.reduce((a, m) => a + m.share, 0)).toBeCloseTo(1);
    expect(weekMinutesFor(slots, MON, (s) => s.act === 'sport')).toBe(120);
  });

  it('copie les créneaux récurrents d’un jour vers d’autres jours', () => {
    const out = copyDay(slots, 1, [5, 6]);
    expect(out[0]?.days).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(out[1]?.days).toEqual([1, 3, 5, 6]);
    expect(out[2]).toBe(slots[2]);
    expect(recurringOn(slots, 1)).toBe(2);
    expect(recurringOn(slots, 5)).toBe(0);
  });

  it('ne copie pas sur un jour où l’horaire est déjà pris', () => {
    const day: Slot[] = [
      { id: 'a', days: [0], startMin: 600, endMin: 660 },
      { id: 'b', days: [2], startMin: 630, endMin: 690 },
    ];
    const out = copyDay(day, 0, [1, 2]);
    expect(out[0]?.days).toEqual([0, 1]);
    expect(out[1]).toBe(day[1]);
    // Déjà présent sur tous les jours cibles : rien ne change.
    expect(copyDay(day, 0, [0])[0]).toBe(day[0]);
  });

  it('signale les chevauchements sur des jours communs', () => {
    const draft: Slot = { id: 'n', days: [1, 5], startMin: 690, endMin: 750 };
    expect(draftOverlaps(draft, slots)).toEqual([{ slot: slots[0], sharedDays: [1] }]);
    expect(draftOverlaps({ ...draft, startMin: 720, endMin: 780 }, slots)).toEqual([]);
    expect(draftOverlaps({ ...draft, once: '2026-11-24' }, slots)).toEqual([]);
    expect(draftOverlaps({ id: 'a', days: [0], startMin: 540, endMin: 720 }, slots)).toEqual([]);
  });

  it('trouve le prochain créneau libre avant le coucher', () => {
    expect(findFreeStart(slots, MON, 60, 500, DEFAULT_RHYTHM)).toBe(720);
    expect(findFreeStart(slots, MON, 60, 1351, DEFAULT_RHYTHM)).toBeNull();
    expect(findFreeStart([], MON, 60, 100, { wakeMin: 1200, sleepMin: 480 })).toBe(105);
  });

  it('reconnaît les jours types', () => {
    expect(daysPreset([6, 5, 4, 3, 2, 1, 0])).toBe('all');
    expect(daysPreset([0, 1, 2, 3, 4])).toBe('weekdays');
    expect(daysPreset([6, 5])).toBe('weekend');
    expect(daysPreset([0, 2])).toBe('custom');
  });
});
