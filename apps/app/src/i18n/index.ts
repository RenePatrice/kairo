import type { Resource } from 'i18next';
import { previewStrings } from '../preview/strings';
import { en } from './en';
import { fr } from './fr';

/** Namespace « app » : écrans de l'app + page de prévisualisation (Phase 0). */
export const appResources = {
  fr: { app: { ...fr, preview: previewStrings.fr } },
  en: { app: { ...en, preview: previewStrings.en } },
} satisfies Resource;

export type { AppStrings } from './fr';
