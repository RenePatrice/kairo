import { AppearanceProvider, createI18n, themes } from '@kairo/ui';
import { useEffect, useMemo, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { appResources } from './i18n';
import { PreviewPage, type DisplaySettings } from './preview/PreviewPage';

const initialLocale = navigator.language.toLowerCase().startsWith('fr') ? 'fr' : 'en';

export function App() {
  const [settings, setSettings] = useState<DisplaySettings>({
    theme: 'minuit',
    accent: 'lav',
    transparency: 'auto',
    motion: 'auto',
    locale: initialLocale,
  });
  const i18n = useMemo(() => createI18n(initialLocale, appResources), []);

  useEffect(() => {
    void i18n.changeLanguage(settings.locale);
    document.documentElement.lang = settings.locale;
  }, [i18n, settings.locale]);

  // Fond de page et barre d'état du navigateur assortis au thème.
  useEffect(() => {
    const t = themes[settings.theme];
    document.body.style.background = t.bg;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.bg);
  }, [settings.theme]);

  return (
    <I18nextProvider i18n={i18n}>
      <AppearanceProvider
        theme={settings.theme}
        accent={settings.accent}
        transparency={settings.transparency}
        motion={settings.motion}
        className="min-h-dvh"
      >
        <PreviewPage
          settings={settings}
          onChange={(patch) => setSettings((s) => ({ ...s, ...patch }))}
        />
      </AppearanceProvider>
    </I18nextProvider>
  );
}
