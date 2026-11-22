import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RHYTHM,
  awakeBars,
  awakeMinutes,
  ceilQuarter,
  dayAnchor,
  greetingFor,
  isAsleep,
  reminderMinute,
  sleepMinutes,
  stepMinute,
} from './rhythm';

describe('rythme', () => {
  it('compte les heures éveillées et de sommeil', () => {
    expect(awakeMinutes(DEFAULT_RHYTHM)).toBe(990);
    expect(sleepMinutes(DEFAULT_RHYTHM)).toBe(450);
  });

  it('dessine une plage d’éveil, ou deux pour un horaire de nuit', () => {
    expect(awakeBars({ wakeMin: 360, sleepMin: 1080 })).toEqual([{ left: 25, width: 50 }]);
    expect(awakeBars({ wakeMin: 1080, sleepMin: 480 })).toEqual([
      { left: 0, width: expect.closeTo(100 / 3) },
      { left: 75, width: 25 },
    ]);
  });

  it('sait si une heure tombe pendant le sommeil', () => {
    expect(isAsleep(1430, DEFAULT_RHYTHM)).toBe(true);
    expect(isAsleep(300, DEFAULT_RHYTHM)).toBe(true);
    expect(isAsleep(420, DEFAULT_RHYTHM)).toBe(false);
    const night = { wakeMin: 1020, sleepMin: 480 };
    expect(isAsleep(600, night)).toBe(true);
    expect(isAsleep(1200, night)).toBe(false);
    expect(isAsleep(-30, DEFAULT_RHYTHM)).toBe(true);
  });

  it('calcule l’heure d’un rappel, même avant minuit', () => {
    expect(reminderMinute(1080, 10)).toBe(1070);
    expect(reminderMinute(5, 10)).toBe(1435);
  });

  it('range les créneaux d’après minuit en fin de journée', () => {
    expect(dayAnchor(60, DEFAULT_RHYTHM)).toBe(1500);
    expect(dayAnchor(300, DEFAULT_RHYTHM)).toBe(300);
    expect(dayAnchor(1000, DEFAULT_RHYTHM)).toBe(1000);
  });

  it('choisit la salutation selon l’heure', () => {
    expect(greetingFor(120)).toBe('night');
    expect(greetingFor(480)).toBe('morning');
    expect(greetingFor(800)).toBe('afternoon');
    expect(greetingFor(1200)).toBe('evening');
  });

  it('avance par quarts d’heure', () => {
    expect(stepMinute(1430, 1)).toBe(5);
    expect(stepMinute(0, -1)).toBe(1425);
    expect(ceilQuarter(61)).toBe(75);
    expect(ceilQuarter(60)).toBe(60);
  });
});
