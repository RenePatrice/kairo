import { describe, expect, it } from 'vitest';
import {
  findConflicts,
  freeWindows,
  layoutLanes,
  nowAndNext,
  occurrencesOn,
  occursOn,
  progress,
  remainingMs,
  validateSlot,
  type Slot,
} from './schedule';

// Semaine du lundi 16 au dimanche 22 novembre 2026, Europe/Paris.
const MON = new Date(2026, 10, 16);
const TUE = new Date(2026, 10, 17);
const SAT = new Date(2026, 10, 21);

const slot = (id: string, days: number[], startMin: number, endMin: number, once?: string): Slot =>
  once === undefined ? { id, days, startMin, endMin } : { id, days, startMin, endMin, once };

const at = (base: Date, h: number, m = 0) =>
  new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m);

describe('occursOn', () => {
  it('suit les jours de répétition', () => {
    const s = slot('a', [0, 2], 600, 660);
    expect(occursOn(s, MON)).toBe(true);
    expect(occursOn(s, TUE)).toBe(false);
  });
  it('un créneau ponctuel ne vaut que sa date', () => {
    const s = slot('a', [0], 600, 660, '2026-11-17');
    expect(occursOn(s, TUE)).toBe(true);
    expect(occursOn(s, MON)).toBe(false);
  });
});

describe('occurrencesOn', () => {
  it('trie par heure de début et calcule les instants réels', () => {
    const list = occurrencesOn([slot('b', [0], 1080, 1140), slot('a', [0], 450, 510)], MON);
    expect(list.map((o) => o.slot.id)).toEqual(['a', 'b']);
    const first = list[0];
    expect(first?.day).toBe('2026-11-16');
    expect(first?.durationMin).toBe(60);
    expect(first?.start).toEqual(at(MON, 7, 30));
    expect(first?.end).toEqual(at(MON, 8, 30));
  });
  it('un bloc 23:00 → 03:00 appartient au jour où il commence', () => {
    const night = slot('n', [0], 1380, 180);
    expect(occurrencesOn([night], MON)).toHaveLength(1);
    expect(occurrencesOn([night], TUE)).toHaveLength(0);
    expect(occurrencesOn([night], MON)[0]?.end).toEqual(at(TUE, 3));
  });
});

describe('nowAndNext', () => {
  const slots = [slot('sport', [0], 1080, 1140), slot('lecture', [0], 1200, 1260)];

  it('trouve le bloc en cours et le suivant', () => {
    const r = nowAndNext(slots, at(MON, 18, 30));
    expect(r.current?.slot.id).toBe('sport');
    expect(r.next?.slot.id).toBe('lecture');
  });
  it('entre deux blocs, il n’y a pas de bloc en cours', () => {
    const r = nowAndNext(slots, at(MON, 19, 30));
    expect(r.current).toBeNull();
    expect(r.next?.slot.id).toBe('lecture');
  });
  it('la fin d’un bloc est exclusive', () => {
    expect(nowAndNext(slots, at(MON, 19)).current).toBeNull();
  });
  it('voit un bloc de la veille encore en cours après minuit', () => {
    const r = nowAndNext([slot('garde', [0], 1320, 360)], at(TUE, 2));
    expect(r.current?.slot.id).toBe('garde');
    expect(r.current?.day).toBe('2026-11-16');
  });
  it('cherche le prochain bloc les jours suivants', () => {
    const r = nowAndNext(slots, at(MON, 22));
    expect(r.next?.day).toBe('2026-11-23');
  });
  it('renvoie null quand rien n’est prévu', () => {
    expect(nowAndNext([], at(MON, 10))).toEqual({ current: null, next: null });
  });
  it('en cas de chevauchement, garde le bloc commencé en dernier', () => {
    const r = nowAndNext(
      [slot('long', [0], 600, 900), slot('court', [0], 660, 720)],
      at(MON, 11, 30),
    );
    expect(r.current?.slot.id).toBe('court');
  });
});

describe('progress / remainingMs', () => {
  const occ = occurrencesOn([slot('a', [0], 600, 660)], MON)[0];
  it('mesure l’avancement entre 0 et 1', () => {
    if (!occ) throw new Error('occurrence attendue');
    expect(progress(occ, at(MON, 9))).toBe(0);
    expect(progress(occ, at(MON, 10, 15))).toBe(0.25);
    expect(progress(occ, at(MON, 12))).toBe(1);
  });
  it('donne le temps restant, jamais négatif', () => {
    if (!occ) throw new Error('occurrence attendue');
    expect(remainingMs(occ, at(MON, 10, 45))).toBe(15 * 60000);
    expect(remainingMs(occ, at(MON, 12))).toBe(0);
  });
});

describe('findConflicts', () => {
  it('signale les chevauchements du jour', () => {
    const c = findConflicts(
      [slot('a', [0], 600, 720), slot('b', [0], 690, 780), slot('c', [0], 780, 840)],
      MON,
    );
    expect(c.map(([x, y]) => [x.slot.id, y.slot.id])).toEqual([['a', 'b']]);
  });
  it('inclut un bloc de la veille qui déborde', () => {
    const c = findConflicts([slot('nuit', [0], 1380, 420), slot('matin', [1], 360, 420)], TUE);
    expect(c.map(([x, y]) => [x.slot.id, y.slot.id])).toEqual([['nuit', 'matin']]);
  });
});

describe('layoutLanes', () => {
  it('place côte à côte les blocs qui se chevauchent', () => {
    const occ = occurrencesOn(
      [
        slot('a', [0], 600, 720),
        slot('b', [0], 660, 780),
        slot('c', [0], 690, 750),
        slot('d', [0], 900, 960),
      ],
      MON,
    );
    const lanes = layoutLanes(occ);
    const byId = Object.fromEntries(lanes.map((l) => [l.occurrence.slot.id, l]));
    expect(byId['a']).toMatchObject({ lane: 0, lanes: 3 });
    expect(byId['b']).toMatchObject({ lane: 1, lanes: 3 });
    expect(byId['c']).toMatchObject({ lane: 2, lanes: 3 });
    expect(byId['d']).toMatchObject({ lane: 0, lanes: 1 });
  });
  it('réutilise une colonne libérée', () => {
    const occ = occurrencesOn(
      [slot('a', [0], 600, 660), slot('b', [0], 630, 720), slot('c', [0], 660, 700)],
      MON,
    );
    const byId = Object.fromEntries(layoutLanes(occ).map((l) => [l.occurrence.slot.id, l]));
    expect(byId['c']).toMatchObject({ lane: 0, lanes: 2 });
  });
});

describe('freeWindows', () => {
  it('liste les trous entre réveil et coucher', () => {
    const free = freeWindows([slot('a', [5], 540, 660), slot('b', [5], 840, 900)], SAT, {
      fromMin: 480,
      toMin: 1320,
    });
    expect(free).toEqual([
      { startMin: 480, endMin: 540 },
      { startMin: 660, endMin: 840 },
      { startMin: 900, endMin: 1320 },
    ]);
  });
  it('ignore les trous trop courts et gère une nuit qui finit après minuit', () => {
    const free = freeWindows([slot('a', [5], 500, 1310)], SAT, {
      fromMin: 480,
      toMin: 1530,
      minLength: 30,
    });
    expect(free).toEqual([{ startMin: 1310, endMin: 1530 }]);
  });
  it('tient compte d’un bloc de la veille qui déborde le matin', () => {
    const free = freeWindows([slot('garde', [4], 1260, 540)], SAT, { fromMin: 420, toMin: 720 });
    expect(free).toEqual([{ startMin: 540, endMin: 720 }]);
  });
});

describe('validateSlot', () => {
  it('accepte un créneau correct', () => {
    expect(validateSlot(slot('a', [0, 1], 600, 660))).toEqual([]);
  });
  it('liste chaque problème', () => {
    expect(validateSlot(slot('a', [], 1500, 1502))).toEqual(
      expect.arrayContaining(['start_out_of_range', 'end_out_of_range', 'no_days']),
    );
    expect(validateSlot(slot('a', [7, 0, 0], 600, 602))).toEqual(
      expect.arrayContaining(['invalid_day', 'duplicate_day', 'too_short']),
    );
  });
  it('un créneau ponctuel n’a pas besoin de jours mais d’une date valide', () => {
    expect(validateSlot(slot('a', [], 600, 660, '2026-11-17'))).toEqual([]);
    expect(validateSlot(slot('a', [], 600, 660, '2026-13-01'))).toEqual(['invalid_date']);
  });
});
