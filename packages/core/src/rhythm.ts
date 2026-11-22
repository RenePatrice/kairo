/**
 * Rythme de l'utilisateur (réveil / coucher), comme l'écran « Ton rythme » de la maquette.
 * Les heures sont des minutes depuis minuit ; la nuit peut commencer le matin (horaires de nuit).
 */
import { MINUTES_PER_DAY, durationMin, normalizeMinute } from './time';

export interface Rhythm {
  wakeMin: number;
  sleepMin: number;
}

export const DEFAULT_RHYTHM: Rhythm = { wakeMin: 420, sleepMin: 1410 };

/** Pas des boutons − / + du rythme et de la fiche créneau. */
export const STEP_MIN = 15;

export function awakeMinutes(r: Rhythm): number {
  return durationMin(r.wakeMin, r.sleepMin);
}

export function sleepMinutes(r: Rhythm): number {
  return MINUTES_PER_DAY - awakeMinutes(r);
}

/** Plages d'éveil sur une barre 0–24 h, en pourcentages (une ou deux plages si l'éveil passe minuit). */
export function awakeBars(r: Rhythm): Array<{ left: number; width: number }> {
  const pct = (m: number) => (m / MINUTES_PER_DAY) * 100;
  if (r.wakeMin < r.sleepMin) return [{ left: pct(r.wakeMin), width: pct(awakeMinutes(r)) }];
  return [
    { left: 0, width: pct(r.sleepMin) },
    { left: pct(r.wakeMin), width: pct(MINUTES_PER_DAY - r.wakeMin) },
  ];
}

export function isAsleep(minute: number, r: Rhythm): boolean {
  const m = normalizeMinute(minute);
  return r.wakeMin < r.sleepMin
    ? m >= r.sleepMin || m < r.wakeMin
    : m >= r.sleepMin && m < r.wakeMin;
}

/** Heure à laquelle sonne un rappel `leadMin` minutes avant le début. */
export function reminderMinute(startMin: number, leadMin: number): number {
  return normalizeMinute(startMin - leadMin);
}

/**
 * Position d'une heure dans la journée de l'utilisateur : ce qui commence bien avant le réveil
 * (plus de 3 h) est rangé en fin de journée, comme un créneau tardif après minuit.
 */
export function dayAnchor(minute: number, r: Rhythm): number {
  return minute < r.wakeMin - 180 ? minute + MINUTES_PER_DAY : minute;
}

export type Greeting = 'night' | 'morning' | 'afternoon' | 'evening';

/** Salutation de l'écran Aujourd'hui : « Encore debout », « Bonjour », « Bel après-midi », « Bonsoir ». */
export function greetingFor(minute: number): Greeting {
  if (minute < 300) return 'night';
  if (minute < 720) return 'morning';
  if (minute < 1080) return 'afternoon';
  return 'evening';
}

/** Décale une heure murale d'un pas, en restant dans 0..1439. */
export function stepMinute(minute: number, steps: number): number {
  return normalizeMinute(minute + steps * STEP_MIN);
}

/** Arrondit au quart d'heure supérieur. */
export function ceilQuarter(minute: number): number {
  return Math.ceil(minute / STEP_MIN) * STEP_MIN;
}
