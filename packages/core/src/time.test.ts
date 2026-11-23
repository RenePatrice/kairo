import { describe, expect, it } from 'vitest';
import {
  MINUTES_PER_DAY,
  crossesMidnight,
  durationMin,
  findClockTimes,
  formatClock,
  formatDuration,
  formatHours,
  formatRange,
  isValidMinute,
  normalizeMinute,
  parseTime,
  toMinute,
} from './time';

describe('findClockTimes', () => {
  it('lit les heures françaises dans l’ordre', () => {
    expect(findClockTimes('Salle mardi et jeudi 18h-19h')).toEqual([1080, 1140]);
    expect(findClockTimes('Lecture 22h-22h30')).toEqual([1320, 1350]);
    expect(findClockTimes('Révisions 7 h 15 à 9:45')).toEqual([435, 585]);
  });
  it('lit am / pm, midi et minuit compris', () => {
    expect(findClockTimes('Gym 6pm to 7:30 pm')).toEqual([1080, 1170]);
    expect(findClockTimes('12am-1am')).toEqual([0, 60]);
    expect(findClockTimes('12pm')).toEqual([720]);
  });
  it('ignore les heures impossibles et le texte sans heure', () => {
    expect(findClockTimes('25h puis 10h75')).toEqual([]);
    expect(findClockTimes('Combien d’heures cette semaine ?')).toEqual([]);
    expect(findClockTimes('3 fois par semaine')).toEqual([]);
  });
});

describe('normalizeMinute', () => {
  it('garde les minutes valides', () => {
    expect(normalizeMinute(0)).toBe(0);
    expect(normalizeMinute(1439)).toBe(1439);
  });
  it('ramène après minuit et avant minuit dans 0..1439', () => {
    expect(normalizeMinute(1440)).toBe(0);
    expect(normalizeMinute(1500)).toBe(60);
    expect(normalizeMinute(-30)).toBe(1410);
    expect(normalizeMinute(-1440 * 3 + 5)).toBe(5);
  });
  it('arrondit les fractions', () => {
    expect(normalizeMinute(59.6)).toBe(60);
  });
});

describe('isValidMinute', () => {
  it('accepte uniquement les entiers 0..1439', () => {
    expect(isValidMinute(0)).toBe(true);
    expect(isValidMinute(1439)).toBe(true);
    expect(isValidMinute(1440)).toBe(false);
    expect(isValidMinute(-1)).toBe(false);
    expect(isValidMinute(10.5)).toBe(false);
    expect(isValidMinute(Number.NaN)).toBe(false);
  });
});

describe('toMinute', () => {
  it('convertit heures et minutes', () => {
    expect(toMinute(7, 30)).toBe(450);
    expect(toMinute(23)).toBe(1380);
  });
  it('refuse les valeurs hors limites', () => {
    expect(() => toMinute(24, 0)).toThrow(RangeError);
    expect(() => toMinute(-1, 0)).toThrow(RangeError);
    expect(() => toMinute(10, 60)).toThrow(RangeError);
    expect(() => toMinute(1.5, 0)).toThrow(RangeError);
  });
});

describe('parseTime', () => {
  it.each([
    ['07:30', 450],
    ['7:30', 450],
    ['7h30', 450],
    ['7h', 420],
    ['19 h 05', 1145],
    ['00:00', 0],
    ['23:59', 1439],
    ['6:30 pm', 1110],
    ['6pm', 1080],
    ['12 am', 0],
    ['12:15 pm', 735],
    ['  18:00  ', 1080],
  ])('lit « %s »', (input, expected) => {
    expect(parseTime(input)).toBe(expected);
  });
  it.each(['', 'midi', '24:00', '7:60', '13 pm', '0 am', '7:5'])('refuse « %s »', (input) => {
    expect(parseTime(input)).toBeNull();
  });
});

describe('durationMin', () => {
  it('calcule une durée dans la même journée', () => {
    expect(durationMin(450, 510)).toBe(60);
  });
  it('gère le passage de minuit', () => {
    expect(durationMin(1380, 180)).toBe(240); // 23:00 → 03:00
    expect(durationMin(1410, 0)).toBe(30);
  });
  it('considère début = fin comme une journée entière', () => {
    expect(durationMin(600, 600)).toBe(MINUTES_PER_DAY);
  });
});

describe('crossesMidnight', () => {
  it('détecte un bloc qui dépasse minuit', () => {
    expect(crossesMidnight(1380, 240)).toBe(true);
    expect(crossesMidnight(1380, 60)).toBe(false);
    expect(crossesMidnight(0, 1440)).toBe(false);
  });
});

describe('formatClock', () => {
  it('affiche en 24 h par défaut', () => {
    expect(formatClock(450)).toBe('07:30');
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(1500)).toBe('01:00');
  });
  it('affiche en 12 h', () => {
    expect(formatClock(0, '12h')).toBe('12:00 am');
    expect(formatClock(450, '12h')).toBe('7:30 am');
    expect(formatClock(720, '12h')).toBe('12:00 pm');
    expect(formatClock(1110, '12h')).toBe('6:30 pm');
  });
});

describe('formatRange', () => {
  it('utilise un tiret demi-cadratin', () => {
    expect(formatRange(450, 510)).toBe('07:30–08:30');
    expect(formatRange(1380, 180, '12h')).toBe('11:00 pm–3:00 am');
  });
});

describe('formatDuration', () => {
  it.each([
    [0, '0 min'],
    [45, '45 min'],
    [60, '1 h'],
    [90, '1 h 30'],
    [125, '2 h 05'],
    [1440, '24 h'],
  ])('%i min → « %s »', (input, expected) => {
    expect(formatDuration(input)).toBe(expected);
  });
});

describe('formatHours', () => {
  it('utilise la virgule en français et le point en anglais', () => {
    expect(formatHours(90, 'fr')).toBe('1,5 h');
    expect(formatHours(90, 'en')).toBe('1.5 h');
    expect(formatHours(600, 'fr')).toBe('10 h');
    expect(formatHours(20, 'en')).toBe('0.3 h');
  });
});
