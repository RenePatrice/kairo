/**
 * Choix de la qualité du verre selon l'appareil et les préférences.
 * - full  : flou + saturation + réfraction SVG (Chromium) + reflet qui suit le pointeur
 * - lite  : flou + saturation seulement (appareils modestes, navigateurs sans réfraction)
 * - solid : surfaces pleines (« réduire la transparence », ou flou non supporté)
 */

export type GlassQuality = 'full' | 'lite' | 'solid';
export type TransparencySetting = 'auto' | 'reduced';
export type MotionSetting = 'auto' | 'reduced';

export interface GlassEnvironment {
  /** Réglage de l'app (Réglages → Transparence). */
  transparency: TransparencySetting;
  /** Préférence système « Réduire la transparence ». */
  prefersReducedTransparency: boolean;
  /** Le navigateur sait-il flouter l'arrière-plan ? */
  supportsBackdrop: boolean;
  /** La réfraction par filtre SVG dans backdrop-filter n'existe que sur Chromium. */
  supportsRefraction: boolean;
  /** Nombre de cœurs logiques, si connu. */
  cores?: number | undefined;
  /** Mémoire de l'appareil en Go (Chromium uniquement), si connue. */
  memoryGb?: number | undefined;
}

/** Appareil modeste : on garde le verre mais sans réfraction, pour tenir 60 images/s. */
export function isLowPowerDevice(env: Pick<GlassEnvironment, 'cores' | 'memoryGb'>): boolean {
  return (
    (env.memoryGb !== undefined && env.memoryGb < 4) || (env.cores !== undefined && env.cores < 4)
  );
}

export function glassQualityFor(env: GlassEnvironment): GlassQuality {
  if (env.transparency === 'reduced' || env.prefersReducedTransparency || !env.supportsBackdrop) {
    return 'solid';
  }
  if (!env.supportsRefraction || isLowPowerDevice(env)) return 'lite';
  return 'full';
}

export function shouldReduceMotion(setting: MotionSetting, prefersReducedMotion: boolean): boolean {
  return setting === 'reduced' || prefersReducedMotion;
}

interface NavigatorHints {
  hardwareConcurrency?: number;
  deviceMemory?: number;
  userAgentData?: { brands?: ReadonlyArray<{ brand: string }> };
}

/** Lit l'environnement réel du navigateur (appelé une fois, côté client). */
export function readBrowserEnvironment(
  transparency: TransparencySetting,
): Omit<GlassEnvironment, 'prefersReducedTransparency'> {
  const nav = navigator as Navigator & NavigatorHints;
  const supports = typeof CSS !== 'undefined' && typeof CSS.supports === 'function';
  const supportsBackdrop =
    supports &&
    (CSS.supports('backdrop-filter', 'blur(1px)') ||
      CSS.supports('-webkit-backdrop-filter', 'blur(1px)'));
  const isChromium = nav.userAgentData?.brands?.some((b) => b.brand === 'Chromium') ?? false;
  return {
    transparency,
    supportsBackdrop,
    supportsRefraction: supportsBackdrop && isChromium,
    cores: nav.hardwareConcurrency,
    memoryGb: nav.deviceMemory,
  };
}
