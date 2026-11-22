import i18next, { type i18n as I18n, type Resource } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from './en';
import { fr } from './fr';

export type AppLocale = 'fr' | 'en';
export const locales: readonly AppLocale[] = ['fr', 'en'];
export const uiResources = { fr: { ui: fr }, en: { ui: en } } satisfies Resource;

/**
 * Crée une instance i18next prête à l'emploi (synchrone). L'app y ajoute ses propres
 * namespaces via `extra`.
 */
export function createI18n(lng: AppLocale = 'fr', extra: Resource = {}): I18n {
  const instance = i18next.createInstance();
  const resources: Resource = {
    fr: { ...uiResources.fr, ...extra['fr'] },
    en: { ...uiResources.en, ...extra['en'] },
  };
  void instance.use(initReactI18next).init({
    lng,
    fallbackLng: 'fr',
    supportedLngs: locales,
    defaultNS: 'ui',
    resources,
    initAsync: false,
    interpolation: { escapeValue: false },
    returnNull: false,
  });
  return instance;
}

export { en, fr };
export type { UiStrings } from './fr';
