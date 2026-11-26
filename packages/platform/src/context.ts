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

/** Fichiers (sauvegarde) de la plateforme courante. */
export function useFiles(): Platform['files'] {
  return useContext(PlatformContext).files;
}

/** Dictée vocale de la plateforme courante. */
export function useSpeech(): Platform['speech'] {
  return useContext(PlatformContext).speech;
}

/** Haptique de la plateforme courante. */
export function useHaptics(): Platform['haptics'] {
  return useContext(PlatformContext).haptics;
}
