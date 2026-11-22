import { describe, expect, it } from 'vitest';
import { formatSpokenTime, gridWindow, hourMarks } from './grid';
import { occurrencesOn, type Slot } from './schedule';

const MON = new Date(2026, 10, 16);
const s = (id: string, startMin: number, endMin: number): Slot => ({
  id,
  days: [0],
  startMin,
  endMin,
});

describe('gridWindow', () => {
  it('prend la fenêtre par défaut sans créneau', () => {
    expect(gridWindow([])).toEqual({ startMin: 420, endMin: 1380 });
    expect(gridWindow([], { defaultStartMin: 360, defaultEndMin: 1320 })).toEqual({
      startMin: 360,
      endMin: 1320,
    });
  });
  it('s’élargit aux créneaux, arrondi à l’heure', () => {
    const occ = occurrencesOn([s('a', 330, 400), s('b', 1350, 1425)], MON);
    expect(gridWindow(occ)).toEqual({ startMin: 300, endMin: 1440 });
  });
  it('déborde après minuit pour un créneau de nuit', () => {
    const occ = occurrencesOn([s('n', 1380, 150)], MON);
    expect(gridWindow(occ)).toEqual({ startMin: 420, endMin: 1620 });
  });
  it('ne rétrécit jamais sous la fenêtre par défaut', () => {
    const occ = occurrencesOn([s('a', 600, 660)], MON);
    expect(gridWindow(occ)).toEqual({ startMin: 420, endMin: 1380 });
  });
});

describe('hourMarks', () => {
  it('liste les graduations avec leur libellé', () => {
    expect(hourMarks({ startMin: 1320, endMin: 1500 })).toEqual([
      { minute: 1320, label: '22:00' },
      { minute: 1380, label: '23:00' },
      { minute: 1440, label: '00:00' },
      { minute: 1500, label: '01:00' },
    ]);
    expect(hourMarks({ startMin: 420, endMin: 600 }, { stepMin: 120, clock: '12h' })).toEqual([
      { minute: 420, label: '7:00 am' },
      { minute: 540, label: '9:00 am' },
    ]);
  });
});

describe('formatSpokenTime', () => {
  it('écrit l’heure comme on la lit', () => {
    expect(formatSpokenTime(1050, 'fr')).toBe('17 h 30');
    expect(formatSpokenTime(1020, 'fr')).toBe('17 h');
    expect(formatSpokenTime(1050, 'en')).toBe('5:30 pm');
    expect(formatSpokenTime(1050, 'en', '24h')).toBe('17:30');
  });
});
