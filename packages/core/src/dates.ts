/**
 * Calendrier en heure locale. Toutes les fonctions travaillent sur des dates « murales »
 * (ce qu'affiche l'horloge), ce qui garde les changements d'heure corrects.
 */

/** Date locale au format AAAA-MM-JJ. */
export type DateKey = string;

/** 0 = dimanche, 1 = lundi (comme `Plan.weekStartsOn`). */
export type WeekStart = 0 | 1;

const pad2 = (n: number): string => String(n).padStart(2, '0');

export function dateKey(date: Date): DateKey {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

const KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isDateKey(key: string): boolean {
  const match = KEY_RE.exec(key);
  if (!match) return false;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/** Minuit local de la date indiquée. */
export function parseDateKey(key: DateKey): Date {
  if (!isDateKey(key)) throw new RangeError(`Date invalide : ${key}`);
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Minuit local, n jours plus tard (ou plus tôt si n < 0). */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** Lundi = 0 … dimanche = 6. C'est l'index utilisé par `Block.days`. */
export function isoWeekday(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function startOfWeek(date: Date, weekStartsOn: WeekStart = 1): Date {
  const offset = (date.getDay() - weekStartsOn + 7) % 7;
  return addDays(date, -offset);
}

/** Numéro de semaine ISO 8601 (la semaine 1 contient le premier jeudi de l'année). */
export function isoWeek(date: Date): { year: number; week: number } {
  const t = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // On se place sur le jeudi de la même semaine : son année est l'année ISO.
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const yearStart = Date.UTC(t.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((t.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return { year: t.getUTCFullYear(), week };
}

/** « W2026-47 » : clé stable pour les objectifs et bilans de semaine. */
export function weekKey(date: Date): string {
  const { year, week } = isoWeek(date);
  return `W${year}-${pad2(week)}`;
}

/** Heure murale actuelle en minutes depuis minuit. */
export function minuteOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/** Durée réelle de la journée : 1440, ou 1380 / 1500 les jours de changement d'heure. */
export function dayLengthMinutes(date: Date): number {
  return Math.round((addDays(date, 1).getTime() - startOfDay(date).getTime()) / 60_000);
}

/**
 * Instant correspondant à une minute murale d'un jour donné. La minute peut dépasser 1440
 * (lendemain) ou être négative (veille). Une heure qui n'existe pas (passage à l'heure d'été)
 * est décalée vers l'avant, comme le font les horloges.
 */
export function atMinute(day: Date | DateKey, minute: number): Date {
  const base = typeof day === 'string' ? parseDateKey(day) : day;
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, minute);
}
