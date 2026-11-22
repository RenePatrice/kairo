/**
 * Heures murales exprimées en minutes depuis minuit (0..1439) et durées en minutes.
 * Aucune date ici : ce module ne dépend ni du fuseau ni du calendrier.
 */

export const MINUTES_PER_DAY = 1440;

export type ClockFormat = '24h' | '12h';
export type Locale = 'fr' | 'en';

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Ramène n'importe quel nombre de minutes dans 0..1439 (arrondi à la minute). */
export function normalizeMinute(minute: number): number {
  const m = Math.round(minute) % MINUTES_PER_DAY;
  return m < 0 ? m + MINUTES_PER_DAY : m;
}

export function isValidMinute(minute: number): boolean {
  return Number.isInteger(minute) && minute >= 0 && minute < MINUTES_PER_DAY;
}

export function toMinute(hours: number, minutes = 0): number {
  if (!Number.isInteger(hours) || hours < 0 || hours > 23) {
    throw new RangeError(`Heure invalide : ${hours}`);
  }
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 59) {
    throw new RangeError(`Minutes invalides : ${minutes}`);
  }
  return hours * 60 + minutes;
}

const TIME_RE = /^(\d{1,2})(?:\s*[h:]\s*(\d{2})?)?\s*(am|pm)?$/;

/** Lit « 07:30 », « 7h30 », « 19 h 05 », « 6:30 pm », « 6pm »… Renvoie null si illisible. */
export function parseTime(input: string): number | null {
  const match = TIME_RE.exec(input.trim().toLowerCase());
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = match[2] === undefined ? 0 : Number(match[2]);
  const meridiem = match[3];
  if (minutes > 59) return null;
  if (meridiem !== undefined) {
    if (hours < 1 || hours > 12) return null;
    hours = (hours % 12) + (meridiem === 'pm' ? 12 : 0);
  }
  if (hours > 23) return null;
  return hours * 60 + minutes;
}

/** Durée entre deux heures murales ; passe minuit si besoin. Début = fin → 24 h. */
export function durationMin(startMin: number, endMin: number): number {
  const d = normalizeMinute(endMin - startMin);
  return d === 0 ? MINUTES_PER_DAY : d;
}

export function crossesMidnight(startMin: number, duration: number): boolean {
  return startMin + duration > MINUTES_PER_DAY;
}

export function formatClock(minute: number, format: ClockFormat = '24h'): string {
  const m = normalizeMinute(minute);
  const h = Math.floor(m / 60);
  const mm = pad2(m % 60);
  if (format === '24h') return `${pad2(h)}:${mm}`;
  return `${h % 12 || 12}:${mm} ${h < 12 ? 'am' : 'pm'}`;
}

/** « 07:30–08:30 » (tiret demi-cadratin). */
export function formatRange(startMin: number, endMin: number, format: ClockFormat = '24h'): string {
  return `${formatClock(startMin, format)}–${formatClock(endMin, format)}`;
}

/** « 45 min », « 1 h », « 1 h 30 ». */
export function formatDuration(minutes: number): string {
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const r = total % 60;
  if (h === 0) return `${r} min`;
  return r === 0 ? `${h} h` : `${h} h ${pad2(r)}`;
}

/** Heures décimales à une décimale : « 1,5 h » (fr) ou « 1.5 h » (en). */
export function formatHours(minutes: number, locale: Locale): string {
  const value = String(Math.round(minutes / 6) / 10);
  return `${locale === 'fr' ? value.replace('.', ',') : value} h`;
}
