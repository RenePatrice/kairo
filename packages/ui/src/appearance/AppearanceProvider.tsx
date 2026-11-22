import { MotionConfig } from 'motion/react';
import { useContext, useId, useMemo, type ReactNode } from 'react';
import type { AccentName, ThemeName } from '../tokens';
import { AppearanceContext, type Appearance } from './context';
import {
  glassQualityFor,
  readBrowserEnvironment,
  shouldReduceMotion,
  type GlassQuality,
  type MotionSetting,
  type TransparencySetting,
} from './detect';
import { RefractionFilter } from '../glass/RefractionFilter';
import { useMediaQuery } from './useMediaQuery';

export interface AppearanceProviderProps {
  theme?: ThemeName;
  accent?: AccentName;
  transparency?: TransparencySetting;
  motion?: MotionSetting;
  /** Force une qualité de verre (page de prévisualisation, tests). */
  glass?: GlassQuality;
  className?: string;
  children: ReactNode;
}

/**
 * Applique thème, accent, transparence et mouvement à tout ce qu'il contient.
 * Peut être imbriqué : la page de prévisualisation montre ainsi plusieurs thèmes côte à côte.
 */
export function AppearanceProvider({
  theme = 'minuit',
  accent = 'lav',
  transparency = 'auto',
  motion = 'auto',
  glass,
  className = '',
  children,
}: AppearanceProviderProps) {
  const parent = useContext(AppearanceContext);
  const ownId = `k-refraction-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const prefersReducedTransparency = useMediaQuery('(prefers-reduced-transparency: reduce)');
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  const value = useMemo<Appearance>(() => {
    const quality =
      glass ??
      glassQualityFor({ ...readBrowserEnvironment(transparency), prefersReducedTransparency });
    return {
      theme,
      accent,
      transparency,
      motion,
      glass: transparency === 'reduced' ? 'solid' : quality,
      reduceMotion: shouldReduceMotion(motion, prefersReducedMotion),
      refractionId: parent.refractionId ?? ownId,
    };
  }, [
    theme,
    accent,
    transparency,
    motion,
    glass,
    prefersReducedTransparency,
    prefersReducedMotion,
    parent.refractionId,
    ownId,
  ]);

  const classes = [
    `theme-${theme}`,
    `accent-${accent}`,
    value.reduceMotion ? 'k-reduce-motion' : '',
    'bg-bg text-ink',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <AppearanceContext.Provider value={value}>
      <MotionConfig reducedMotion={value.reduceMotion ? 'always' : 'never'}>
        <div className={classes} data-glass={value.glass}>
          {parent.refractionId === null ? <RefractionFilter id={ownId} /> : null}
          {children}
        </div>
      </MotionConfig>
    </AppearanceContext.Provider>
  );
}
