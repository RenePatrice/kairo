import { createContext, useContext } from 'react';
import type { AccentName, ThemeName } from '../tokens';
import type { GlassQuality, MotionSetting, TransparencySetting } from './detect';

export interface Appearance {
  theme: ThemeName;
  accent: AccentName;
  transparency: TransparencySetting;
  motion: MotionSetting;
  /** Qualité de verre effectivement utilisée. */
  glass: GlassQuality;
  /** Animations réduites (réglage de l'app ou préférence système). */
  reduceMotion: boolean;
  /** Identifiant du filtre SVG de réfraction partagé (null hors verre complet). */
  refractionId: string | null;
}

export const AppearanceContext = createContext<Appearance>({
  theme: 'minuit',
  accent: 'lav',
  transparency: 'auto',
  motion: 'auto',
  glass: 'lite',
  reduceMotion: false,
  refractionId: null,
});

export function useAppearance(): Appearance {
  return useContext(AppearanceContext);
}
