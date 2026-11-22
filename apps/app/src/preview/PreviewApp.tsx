import { AppearanceProvider, themes } from '@kairo/ui';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PreviewPage, type DisplaySettings } from './PreviewPage';

/** Page de prévisualisation des composants (Phase 0), accessible via /#preview. */
export function PreviewApp() {
  const { i18n } = useTranslation();
  const [settings, setSettings] = useState<DisplaySettings>({
    theme: 'minuit',
    accent: 'lav',
    transparency: 'auto',
    motion: 'auto',
    locale: i18n.language === 'en' ? 'en' : 'fr',
  });

  useEffect(() => {
    void i18n.changeLanguage(settings.locale);
    document.documentElement.lang = settings.locale;
  }, [i18n, settings.locale]);

  useEffect(() => {
    const t = themes[settings.theme];
    document.body.style.background = t.bg;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.bg);
  }, [settings.theme]);

  return (
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
  );
}
