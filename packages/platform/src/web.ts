import type { Haptics, ImpactStyle, NotificationFeedback, Platform } from './types';

/** Motifs de vibration (ms) pour les navigateurs qui la supportent (Chrome Android). */
export const VIBRATION_PATTERNS = {
  impact: { light: [8], medium: [14], heavy: [22] } satisfies Record<ImpactStyle, number[]>,
  notify: {
    success: [10, 40, 14],
    warning: [18, 60, 18],
    error: [24, 50, 24, 50, 24],
  } satisfies Record<NotificationFeedback, number[]>,
  selection: [4],
} as const;

type Vibrate = (pattern: number[]) => boolean;

/** Haptique web : `navigator.vibrate` si disponible, sinon rien (Safari, ordinateur). */
export function createWebHaptics(vibrate: Vibrate | null = defaultVibrate()): Haptics {
  const run = (pattern: readonly number[]): Promise<void> => {
    vibrate?.([...pattern]);
    return Promise.resolve();
  };
  return {
    impact: (style = 'light') => run(VIBRATION_PATTERNS.impact[style]),
    notify: (type) => run(VIBRATION_PATTERNS.notify[type]),
    selection: () => run(VIBRATION_PATTERNS.selection),
  };
}

function defaultVibrate(): Vibrate | null {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return null;
  return (pattern) => navigator.vibrate(pattern);
}

export function createWebPlatform(): Platform {
  return { kind: 'web', haptics: createWebHaptics() };
}

/** Haptique muette (réglage « vibrations » désactivé). */
export const silentHaptics: Haptics = {
  impact: () => Promise.resolve(),
  notify: () => Promise.resolve(),
  selection: () => Promise.resolve(),
};
