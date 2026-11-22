/**
 * Angles du cadran 24 h de l'écran Aujourd'hui (minuit en haut, sens horaire).
 * L'interface ne fait que dessiner ces angles.
 */
import type { Rhythm } from './rhythm';
import { MINUTES_PER_DAY, durationMin } from './time';

export type ArcSpan = readonly [from: number, to: number];

export function minuteToAngle(minute: number): number {
  return (minute / MINUTES_PER_DAY) * 360;
}

/** Coupe un arc qui dépasse minuit en deux morceaux. */
function wrap(a0: number, a1: number): ArcSpan[] {
  if (a1 <= a0) return [];
  return a1 > 360
    ? [
        [a0, 359.9],
        [0.1, a1 - 360],
      ]
    : [[a0, a1]];
}

/** Arc d'un créneau, avec un petit espace `gapDeg` à chaque bout pour séparer les créneaux voisins. */
export function slotArc(startMin: number, length: number, gapDeg = 1.2): ArcSpan[] {
  return wrap(minuteToAngle(startMin) + gapDeg, minuteToAngle(startMin + length) - gapDeg);
}

/** Arc fin du sommeil, du coucher au réveil. */
export function sleepArc(r: Rhythm): ArcSpan[] {
  const a0 = minuteToAngle(r.sleepMin);
  const a1 = a0 + minuteToAngle(durationMin(r.sleepMin, r.wakeMin));
  const spans: ArcSpan[] =
    a1 > 360
      ? [
          [a0 + 1, 359.9],
          [0.1, a1 - 361],
        ]
      : [[a0 + 1, a1 - 1]];
  return spans.filter(([x, y]) => y > x);
}

/** Graduations horaires : 24 traits, les heures multiples de 6 sont marquées. */
export function hourTicks(): Array<{ hour: number; angle: number; major: boolean }> {
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    angle: hour * 15,
    major: hour % 6 === 0,
  }));
}
