import { describe, expect, it } from 'vitest';
import { nextFreeStart, slotConflicts } from './conflicts';
import type { Slot } from './schedule';

const s = (
  id: string,
  days: number[],
  startMin: number,
  endMin: number,
  once: string | null = null,
): Slot => ({
  id,
  days,
  startMin,
  endMin,
  once,
});

const existing = [
  s('salle', [1, 3], 1080, 1140), // mar. et jeu. 18:00–19:00
  s('nuit', [4], 1380, 60), // ven. 23:00 → sam. 01:00
  s('rdv', [], 600, 660, '2026-11-25'), // mer. 25 nov. 10:00–11:00
];

describe('slotConflicts', () => {
  it('trouve les jours communs qui se chevauchent entre créneaux récurrents', () => {
    expect(slotConflicts(s('new', [0, 1, 3], 1110, 1170), existing)).toEqual([
      { slot: existing[0], days: [1, 3] },
    ]);
  });

  it('accepte des créneaux qui se touchent sans se chevaucher', () => {
    expect(slotConflicts(s('new', [1], 1140, 1200), existing)).toEqual([]);
    expect(slotConflicts(s('new', [1], 1020, 1080), existing)).toEqual([]);
  });

  it('voit le débordement après minuit sur le lendemain', () => {
    expect(slotConflicts(s('new', [5], 0, 30), existing).map((c) => c.slot.id)).toEqual(['nuit']);
    // Dimanche soir qui déborde sur lundi matin (la semaine boucle).
    const sunday = [s('dim', [6], 1410, 30)];
    expect(slotConflicts(s('new', [0], 0, 60), sunday).map((c) => c.days)).toEqual([[0]]);
  });

  it('compare ponctuel et récurrent, ponctuel et ponctuel', () => {
    expect(slotConflicts(s('new', [], 1110, 1140, '2026-11-24'), existing)).toEqual([
      { slot: existing[0], days: [1] },
    ]);
    expect(slotConflicts(s('new', [2], 630, 690), existing).map((c) => c.slot.id)).toEqual(['rdv']);
    expect(
      slotConflicts(s('new', [], 630, 690, '2026-11-25'), existing).map((c) => c.slot.id),
    ).toEqual(['rdv']);
    expect(slotConflicts(s('new', [], 630, 690, '2026-11-26'), existing)).toEqual([]);
  });

  it('ignore les créneaux ponctuels déjà passés', () => {
    expect(slotConflicts(s('new', [2], 630, 690), existing, '2026-11-26')).toEqual([]);
    expect(slotConflicts(s('new', [2], 630, 690), existing, '2026-11-25')).toHaveLength(1);
  });

  it('ignore le créneau lui-même (modification)', () => {
    expect(slotConflicts(s('salle', [1, 3], 1090, 1150), existing)).toEqual([]);
  });
});

describe('nextFreeStart', () => {
  it('propose le premier horaire libre de même durée', () => {
    expect(nextFreeStart(s('new', [1], 1110, 1170), existing)).toBe(1140);
    expect(nextFreeStart(s('new', [1], 900, 960), existing)).toBe(900);
  });

  it('renvoie null quand toute la journée est prise', () => {
    const full = [s('full', [0], 0, 0)];
    expect(nextFreeStart(s('new', [0], 600, 660), full)).toBeNull();
  });
});
