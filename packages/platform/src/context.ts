import { createContext, useContext } from 'react';
import type { Platform } from './types';
import { createWebPlatform } from './web';

export const PlatformContext = createContext<Platform>(createWebPlatform());

export function usePlatform(): Platform {
  return useContext(PlatformContext);
}

/** Haptique de la plateforme courante. */
export function useHaptics(): Platform['haptics'] {
  return useContext(PlatformContext).haptics;
}
