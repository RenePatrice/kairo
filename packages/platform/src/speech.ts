/**
 * Dictée pour l'assistant. Navigateur : Web Speech (`SpeechRecognition`, Chrome / Edge / Safari).
 * APK et app iOS : plugin Capacitor (la WebView Android n'a pas Web Speech). La phrase reconnue
 * est placée dans la barre de saisie ; l'utilisateur la relit avant d'envoyer.
 */
import { SpeechRecognition as NativeSpeech } from '@capacitor-community/speech-recognition';
import type { Speech, SpeechLocale } from './types';

const LANG: Record<SpeechLocale, string> = { fr: 'fr-FR', en: 'en-US' };

/** Sous-ensemble de l'API Web Speech utilisé ici (absente des types DOM de TypeScript). */
export interface WebRecognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
export type WebRecognitionCtor = new () => WebRecognition;

function defaultCtor(): WebRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: WebRecognitionCtor;
    webkitSpeechRecognition?: WebRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function createWebSpeech(Ctor: WebRecognitionCtor | null = defaultCtor()): Speech {
  let current: WebRecognition | null = null;
  return {
    available: () => Promise.resolve(Ctor !== null),
    listen: (locale) =>
      new Promise((resolve) => {
        if (!Ctor) return resolve(null);
        current?.stop();
        const rec = new Ctor();
        current = rec;
        rec.lang = LANG[locale];
        rec.interimResults = false;
        rec.maxAlternatives = 1;
        rec.continuous = false;
        let text: string | null = null;
        rec.onresult = (e) => {
          text = e.results[0]?.[0]?.transcript.trim() || null;
        };
        rec.onerror = () => {
          text = null;
        };
        rec.onend = () => {
          if (current === rec) current = null;
          resolve(text);
        };
        try {
          rec.start();
        } catch {
          current = null;
          resolve(null);
        }
      }),
    stop: () => {
      current?.stop();
      return Promise.resolve();
    },
  };
}

export function createNativeSpeech(): Speech {
  return {
    available: async () => {
      try {
        return (await NativeSpeech.available()).available;
      } catch {
        return false;
      }
    },
    listen: async (locale) => {
      try {
        let perm = (await NativeSpeech.checkPermissions()).speechRecognition;
        if (perm !== 'granted') perm = (await NativeSpeech.requestPermissions()).speechRecognition;
        if (perm !== 'granted') return null;
        const { matches } = await NativeSpeech.start({
          language: LANG[locale],
          maxResults: 1,
          partialResults: false,
          popup: false,
        });
        return matches?.[0]?.trim() || null;
      } catch {
        // Rien entendu, écoute annulée ou service absent.
        return null;
      }
    },
    stop: async () => {
      try {
        await NativeSpeech.stop();
      } catch {
        // Déjà arrêtée.
      }
    },
  };
}
