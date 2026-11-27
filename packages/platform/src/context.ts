import { createContext, useContext } from 'react';
import type { Platform } from './types';
import { createWebPlatform } from './web';

export const PlatformContext = createContext<Platform>(createWebPlatform());

export function usePlatform(): Platform {
  return useContext(PlatformContext);
}

/** Notifications (rappels) de la plateforme courante. */
export function useNotifications(): Platform['notifications'] {
  return useContext(PlatformContext).notifications;
}

/** Bouton Retour du téléphone. */
export function useBack(): Platform['back'] {
  return useContext(PlatformContext).back;
}

/** Fichiers (sauvegarde) de la plateforme courante. */
export function useFiles(): Platform['files'] {
  return useContext(PlatformContext).files;
}

/** Dictée vocale de la plateforme courante. */
export function useSpeech(): Platform['speech'] {
  return useContext(PlatformContext).speech;
}

/** Voix des rappels. */
export function useVoice(): Platform['voice'] {
  return useContext(PlatformContext).voice;
}

/** Minuteur de focus hors de l'app. */
export function useFocusStatus(): Platform['focusStatus'] {
  return useContext(PlatformContext).focusStatus;
}

/** Haptique de la plateforme courante. */
export function useHaptics(): Platform['haptics'] {
  return useContext(PlatformContext).haptics;
}
