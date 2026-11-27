/**
 * Plateforme native (APK Android, app iOS) via les plugins Capacitor. Le même build web tourne
 * dans la coque Capacitor ; dans un navigateur, on garde la version web.
 */
import { Capacitor } from '@capacitor/core';
import { Haptics as NativeHaptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { createNativeBack } from './back';
import { createNativeFiles } from './files';
import { createNativeNotifications } from './nativeNotifications';
import { createNativeSpeech } from './speech';
import type { Haptics, Platform } from './types';
import { createWebPlatform } from './web';

const IMPACT = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
const NOTIFY = {
  success: NotificationType.Success,
  warning: NotificationType.Warning,
  error: NotificationType.Error,
};

export function createNativeHaptics(): Haptics {
  return {
    impact: (style = 'light') => NativeHaptics.impact({ style: IMPACT[style] }),
    notify: (type) => NativeHaptics.notification({ type: NOTIFY[type] }),
    selection: async () => {
      await NativeHaptics.selectionStart();
      await NativeHaptics.selectionChanged();
      await NativeHaptics.selectionEnd();
    },
  };
}

/** Plateforme courante : native dans Capacitor, web sinon. */
export function detectPlatform(): Platform {
  if (!Capacitor.isNativePlatform()) return createWebPlatform();
  const kind = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';
  return {
    kind,
    haptics: createNativeHaptics(),
    notifications: createNativeNotifications(),
    speech: createNativeSpeech(),
    files: createNativeFiles(),
    back: createNativeBack(),
  };
}
