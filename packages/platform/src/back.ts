/**
 * Bouton Retour du téléphone (Android). Sans gestionnaire, Android quitte l'app : on ferme
 * plutôt la fiche ou l'écran ouvert. Dans un navigateur, rien à faire (pas de bouton système).
 */
import { App } from '@capacitor/app';
import type { Back } from './types';

export const webBack: Back = {
  onBack: () => () => undefined,
  minimize: () => Promise.resolve(),
};

export function createNativeBack(): Back {
  return {
    onBack: (handler) => {
      const listener = App.addListener('backButton', () => {
        // `handler` renvoie false s'il n'y a plus rien à fermer : l'app passe en arrière-plan.
        if (!handler()) void App.minimizeApp();
      });
      return () => {
        void listener.then((l) => l.remove());
      };
    },
    minimize: () => App.minimizeApp(),
  };
}
