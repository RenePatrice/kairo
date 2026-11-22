import { DbContext } from '@kairo/db';
import { PlatformContext, createWebPlatform, silentHaptics } from '@kairo/platform';
import { AppearanceProvider, createI18n, themes, type AppLocale } from '@kairo/ui';
import { useEffect, useMemo, type ReactNode } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { db } from './db';
import { appResources } from './i18n';
import { useAppData } from './lib/data';
import { DataProvider } from './lib/DataProvider';
import { PreviewApp } from './preview/PreviewApp';
import { Shell } from './shell/Shell';
import { useUi } from './store';

const browserLocale: AppLocale = navigator.language.toLowerCase().startsWith('en') ? 'en' : 'fr';
const webPlatform = createWebPlatform();
const quietPlatform = { ...webPlatform, haptics: silentHaptics };

export function App() {
  const i18n = useMemo(() => createI18n(browserLocale, appResources), []);
  return (
    <I18nextProvider i18n={i18n}>
      {/* Page de prévisualisation des composants (Phase 0) : /#preview */}
      {window.location.hash === '#preview' ? (
        <PreviewApp />
      ) : (
        <DbContext.Provider value={db}>
          <DataProvider fallback={null}>
            <Root />
          </DataProvider>
        </DbContext.Provider>
      )}
    </I18nextProvider>
  );
}

function Root() {
  const { settings } = useAppData();
  const screen = useUi((s) => s.screen);
  const go = useUi((s) => s.go);

  // Premier écran : la langue, puis l'accueil, ou Aujourd'hui si le programme existe déjà.
  useEffect(() => {
    if (screen === null) go(!settings.locale ? 'lang' : settings.started ? 'today' : 'welcome');
  }, [screen, go, settings.locale, settings.started]);

  return (
    <LocaleSync locale={settings.locale ?? 'fr'}>
      <ThemeSync theme={settings.theme} big={settings.options.big} />
      <PlatformContext.Provider value={settings.options.haptic ? webPlatform : quietPlatform}>
        <AppearanceProvider
          theme={settings.theme}
          accent={settings.accent}
          transparency={settings.options.solid ? 'reduced' : 'auto'}
          className="min-h-dvh"
        >
          {screen ? <Shell screen={screen} /> : null}
        </AppearanceProvider>
      </PlatformContext.Provider>
    </LocaleSync>
  );
}

function LocaleSync({ locale, children }: { locale: AppLocale; children: ReactNode }) {
  const { i18n } = useTranslation();
  useEffect(() => {
    if (i18n.language !== locale) void i18n.changeLanguage(locale);
    document.documentElement.lang = locale;
  }, [i18n, locale]);
  return <>{children}</>;
}

/** Fond de page, barre d'état et « Texte plus grand » assortis aux réglages. */
function ThemeSync({ theme, big }: { theme: keyof typeof themes; big: boolean }) {
  useEffect(() => {
    const t = themes[theme];
    document.body.style.background = t.bg;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.bg);
  }, [theme]);
  useEffect(() => {
    document.documentElement.style.fontSize = big ? '110%' : '';
  }, [big]);
  return null;
}
