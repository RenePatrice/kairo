/** Calculs d'affichage de la grille : fenêtre horaire adaptative et graduations. */
import type { Occurrence } from './schedule';
import { formatClock, normalizeMinute, type ClockFormat, type Locale } from './time';

export interface GridWindow {
  /** Première minute affichée (relative au minuit du jour). */
  startMin: number;
  /** Dernière minute affichée ; peut dépasser 1440 pour les nuits. */
  endMin: number;
}

export interface GridWindowOptions {
  defaultStartMin?: number;
  defaultEndMin?: number;
}

/**
 * Fenêtre de la grille : la plage par défaut, élargie pour contenir tous les créneaux,
 * arrondie à l'heure. Un créneau de nuit étend la fin au-delà de minuit.
 */
export function gridWindow(
  occurrences: readonly Occurrence[],
  { defaultStartMin = 420, defaultEndMin = 1380 }: GridWindowOptions = {},
): GridWindow {
  let start = defaultStartMin;
  let end = defaultEndMin;
  for (const o of occurrences) {
    start = Math.min(start, o.startMin);
    end = Math.max(end, o.startMin + o.durationMin);
  }
  return { startMin: Math.floor(start / 60) * 60, endMin: Math.ceil(end / 60) * 60 };
}

export interface HourMark {
  minute: number;
  label: string;
}

export function hourMarks(
  window: GridWindow,
  { stepMin = 60, clock = '24h' }: { stepMin?: number; clock?: ClockFormat } = {},
): HourMark[] {
  const marks: HourMark[] = [];
  for (let m = window.startMin; m <= window.endMin; m += stepMin) {
    marks.push({ minute: m, label: formatClock(m, clock) });
  }
  return marks;
}

/** Heure telle qu'on la dit, pour les lecteurs d'écran : « 17 h 30 », « 5:30 pm ». */
export function formatSpokenTime(
  minute: number,
  locale: Locale,
  clock: ClockFormat = locale === 'fr' ? '24h' : '12h',
): string {
  if (locale === 'en' || clock === '12h') return formatClock(minute, clock);
  const m = normalizeMinute(minute);
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h} h` : `${h} h ${String(r).padStart(2, '0')}`;
}
