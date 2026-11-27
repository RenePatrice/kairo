/**
 * Voix des rappels. Navigateur : synthèse vocale du navigateur, app ouverte seulement.
 * APK : module natif Kairo (TextToSpeech d'Android), qui parle à l'heure même app fermée.
 */
import { registerPlugin } from '@capacitor/core';
import type { FocusStatus, FocusStatusInfo, SpeechLocale, Voice, VoiceAnnouncement } from './types';

const LANG: Record<SpeechLocale, string> = { fr: 'fr-FR', en: 'en-US' };

export interface WebVoiceEnv {
  speak(text: string, lang: string): void;
}

export function createWebVoice(env: WebVoiceEnv | null = defaultVoiceEnv()): Voice {
  return {
    background: false,
    speak: (text, locale) => {
      env?.speak(text, LANG[locale]);
      return Promise.resolve();
    },
    schedule: () => Promise.resolve(),
  };
}

function defaultVoiceEnv(): WebVoiceEnv | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  return {
    speak: (text, lang) => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    },
  };
}

/** Le navigateur ne peut rien afficher hors de la page : le minuteur reste dans l'app. */
export const webFocusStatus: FocusStatus = {
  show: () => Promise.resolve(),
  hide: () => Promise.resolve(),
};

/** Module natif écrit pour Kairo (apps/app/android/.../KairoNativePlugin.java). */
export interface KairoNativePlugin {
  speak(o: { text: string; lang: string }): Promise<void>;
  scheduleVoice(o: {
    lang: string;
    items: Array<{ id: number; at: number; text: string }>;
  }): Promise<void>;
  showFocus(o: FocusStatusInfo): Promise<void>;
  hideFocus(): Promise<void>;
}

export function createNativeVoice(
  plugin: KairoNativePlugin = registerPlugin<KairoNativePlugin>('KairoNative'),
): Voice {
  return {
    background: true,
    speak: (text, locale) => plugin.speak({ text, lang: LANG[locale] }),
    schedule: (list: readonly VoiceAnnouncement[], locale) =>
      plugin.scheduleVoice({
        lang: LANG[locale],
        items: list
          .filter((v) => v.at.getTime() > Date.now())
          .map((v) => ({ id: v.id, at: v.at.getTime(), text: v.text })),
      }),
  };
}

export function createNativeFocusStatus(
  plugin: KairoNativePlugin = registerPlugin<KairoNativePlugin>('KairoNative'),
): FocusStatus {
  return {
    show: (info) => plugin.showFocus(info),
    hide: () => plugin.hideFocus(),
  };
}
