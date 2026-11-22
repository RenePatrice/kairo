import { ambientStops } from './tokens';

/**
 * Couleurs des deux halos d'ambiance pour une minute murale (fournie par core.minuteOfDay).
 * Pendant un bloc, le premier halo prend la couleur de l'activité en cours.
 */
export function ambientColors(minute: number, activityColor?: string): readonly [string, string] {
  const stop =
    ambientStops.find((s) => minute < s.untilMin) ?? ambientStops[ambientStops.length - 1];
  const [a, b] = stop?.colors ?? ambientStops[0].colors;
  return [activityColor ?? a, b];
}
