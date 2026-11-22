import type { Transition } from 'motion/react';
import { springs } from '../tokens';

export type SpringName = keyof typeof springs;

/** Ressort du système de design, typé pour Motion. */
export function spring(name: SpringName): Transition {
  return springs[name];
}

/**
 * Fondu simple utilisé quand les animations sont réduites : on garde le changement
 * d'opacité (repère visuel) mais aucun déplacement ni rebond.
 */
export const reducedFade: Transition = { duration: 0.18, ease: 'easeOut' };

export function transitionFor(name: SpringName, reduceMotion: boolean): Transition {
  return reduceMotion ? reducedFade : spring(name);
}

/** Entrée d'écran ou de carte : montée douce + fondu (cf. animation « wbin » de la maquette). */
export const riseIn = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 12 },
} as const;
