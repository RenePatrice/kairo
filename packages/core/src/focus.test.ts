import { describe, expect, it } from 'vitest';
import {
  focusRemaining,
  pauseFocus,
  resumeFocus,
  setPomodoro,
  splitDuration,
  startFocus,
  tickPomodoro,
} from './focus';
import { occurrencesOn, type Slot } from './schedule';

const slot: Slot = { id: 'a', days: [0], startMin: 600, endMin: 660 };
const [occ] = occurrencesOn([slot], new Date(2026, 10, 23));
if (!occ) throw new Error('occurrence attendue');
const t = (h: number, m = 0) => new Date(2026, 10, 23, h, m).getTime();
const MIN = 60_000;

describe('focus', () => {
  it('va jusqu’à la fin d’un créneau en cours', () => {
    const f = startFocus(occ, t(10, 20));
    expect(f.endAt).toBe(t(11));
    expect(focusRemaining(f, t(10, 20))).toEqual({
      leftMs: 40 * MIN,
      progress: expect.closeTo(1 / 3),
    });
  });

  it('dure tout le créneau s’il n’a pas commencé', () => {
    const f = startFocus(occ, t(9));
    expect(f.endAt - t(9)).toBe(60 * MIN);
    expect(focusRemaining(f, t(11)).leftMs).toBe(0);
  });

  it('se met en pause et reprend', () => {
    const f = startFocus(occ, t(10));
    const p = pauseFocus(f, t(10, 30));
    expect(p.pausedLeft).toBe(30 * MIN);
    expect(pauseFocus(p, t(10, 40))).toBe(p);
    expect(focusRemaining(p, t(10, 50)).leftMs).toBe(30 * MIN);
    const r = resumeFocus(p, t(10, 50));
    expect(r.endAt).toBe(t(11, 20));
    expect(resumeFocus(r, t(11))).toBe(r);
  });

  it('enchaîne travail et pause en Pomodoro', () => {
    const f = setPomodoro(startFocus(occ, t(10)), true, t(10));
    expect(focusRemaining(f, t(10, 5))).toEqual({
      leftMs: 20 * MIN,
      progress: expect.closeTo(0.2),
    });
    expect(tickPomodoro(f, t(10, 10)).changed).toBeNull();
    const b = tickPomodoro(f, t(10, 25));
    expect(b.changed).toBe('break');
    expect(b.session.pomodoro).toEqual({ phase: 'break', endAt: t(10, 30), cycles: 1 });
    const w = tickPomodoro(b.session, t(10, 30));
    expect(w.changed).toBe('work');
    expect(w.session.pomodoro?.cycles).toBe(1);
    expect(setPomodoro(f, false, t(10)).pomodoro).toBeNull();
  });

  it('reprend une pause Pomodoro au bon moment', () => {
    const f = setPomodoro(startFocus(occ, t(10)), true, t(10));
    const r = resumeFocus(pauseFocus(f, t(10, 5)), t(10, 15));
    expect(r.pomodoro?.endAt).toBe(t(10, 35));
    expect(tickPomodoro(pauseFocus(f, t(10, 5)), t(11)).changed).toBeNull();
  });

  it('découpe une durée', () => {
    expect(splitDuration(3_909_000)).toEqual({ h: 1, m: 5, s: 9 });
    expect(splitDuration(-5)).toEqual({ h: 0, m: 0, s: 0 });
  });
});
