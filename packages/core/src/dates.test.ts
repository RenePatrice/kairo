import { describe, expect, it } from 'vitest';
import {
  addDays,
  atMinute,
  dateKey,
  dayLengthMinutes,
  isoWeek,
  isoWeekday,
  minuteOfDay,
  parseDateKey,
  startOfWeek,
  weekKey,
} from './dates';

// Les tests tournent en Europe/Paris (voir vitest.config.ts).
// 2026 : passage à l'heure d'été le 29 mars, retour à l'heure d'hiver le 25 octobre.

describe('dateKey / parseDateKey', () => {
  it('formate en date locale AAAA-MM-JJ', () => {
    expect(dateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(dateKey(new Date(2026, 10, 22, 0, 0))).toBe('2026-11-22');
  });
  it('relit une clé en minuit local', () => {
    const d = parseDateKey('2026-03-29');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(2);
    expect(d.getDate()).toBe(29);
    expect(d.getHours()).toBe(0);
  });
  it('refuse une clé invalide', () => {
    expect(() => parseDateKey('2026-02-30')).toThrow(RangeError);
    expect(() => parseDateKey('22/11/2026')).toThrow(RangeError);
  });
});

describe('addDays', () => {
  it('avance au minuit local même pendant le changement d’heure', () => {
    const d = addDays(new Date(2026, 2, 28, 15, 0), 1);
    expect(dateKey(d)).toBe('2026-03-29');
    expect(d.getHours()).toBe(0);
    expect(dateKey(addDays(new Date(2026, 9, 25), 1))).toBe('2026-10-26');
  });
  it('recule et change de mois ou d’année', () => {
    expect(dateKey(addDays(new Date(2026, 0, 1), -1))).toBe('2025-12-31');
  });
});

describe('isoWeekday', () => {
  it('numérote lundi = 0 … dimanche = 6', () => {
    expect(isoWeekday(new Date(2026, 10, 16))).toBe(0); // lundi
    expect(isoWeekday(new Date(2026, 10, 22))).toBe(6); // dimanche
  });
});

describe('startOfWeek', () => {
  it('commence le lundi par défaut', () => {
    expect(dateKey(startOfWeek(new Date(2026, 10, 22, 18)))).toBe('2026-11-16');
    expect(dateKey(startOfWeek(new Date(2026, 10, 16)))).toBe('2026-11-16');
  });
  it('peut commencer le dimanche', () => {
    expect(dateKey(startOfWeek(new Date(2026, 10, 22), 0))).toBe('2026-11-22');
    expect(dateKey(startOfWeek(new Date(2026, 10, 21), 0))).toBe('2026-11-15');
  });
});

describe('isoWeek / weekKey', () => {
  it('suit la norme ISO 8601', () => {
    expect(isoWeek(new Date(2026, 10, 22))).toEqual({ year: 2026, week: 47 });
    expect(isoWeek(new Date(2021, 0, 1))).toEqual({ year: 2020, week: 53 });
    expect(isoWeek(new Date(2024, 11, 30))).toEqual({ year: 2025, week: 1 });
  });
  it('produit une clé stable', () => {
    expect(weekKey(new Date(2026, 10, 22))).toBe('W2026-47');
    expect(weekKey(new Date(2026, 0, 5))).toBe('W2026-02');
  });
});

describe('minuteOfDay', () => {
  it('donne l’heure murale en minutes', () => {
    expect(minuteOfDay(new Date(2026, 10, 22, 7, 30, 59))).toBe(450);
  });
});

describe('dayLengthMinutes', () => {
  it('vaut 1440 un jour normal', () => {
    expect(dayLengthMinutes(new Date(2026, 10, 22))).toBe(1440);
  });
  it('vaut 1380 le jour du passage à l’heure d’été', () => {
    expect(dayLengthMinutes(new Date(2026, 2, 29, 12))).toBe(1380);
  });
  it('vaut 1500 le jour du retour à l’heure d’hiver', () => {
    expect(dayLengthMinutes(new Date(2026, 9, 25))).toBe(1500);
  });
});

describe('atMinute', () => {
  it('place une minute murale dans la journée', () => {
    const d = atMinute('2026-11-22', 450);
    expect(d.getHours()).toBe(7);
    expect(d.getMinutes()).toBe(30);
  });
  it('déborde sur le lendemain au-delà de 1440', () => {
    const d = atMinute(new Date(2026, 10, 22, 13), 1440 + 180);
    expect(dateKey(d)).toBe('2026-11-23');
    expect(d.getHours()).toBe(3);
  });
  it('décale une heure inexistante (heure d’été) vers l’avant', () => {
    const d = atMinute('2026-03-29', 150); // 02:30 n'existe pas
    expect(d.getHours()).toBe(3);
    expect(d.getMinutes()).toBe(30);
  });
  it('un bloc de nuit dure une heure de plus au retour à l’heure d’hiver', () => {
    const start = atMinute('2026-10-24', 1380); // samedi 23:00
    const end = atMinute('2026-10-24', 1380 + 240); // dimanche 03:00
    expect((end.getTime() - start.getTime()) / 60000).toBe(300);
  });
});
