import { render, type RenderResult } from '@testing-library/react';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { AppearanceProvider, type AppearanceProviderProps } from './appearance/AppearanceProvider';
import { createI18n, type AppLocale } from './i18n';

/** Rend un composant avec i18n et apparence, comme dans l'app. */
export function renderUi(
  ui: ReactNode,
  {
    locale = 'fr',
    appearance = {},
  }: { locale?: AppLocale; appearance?: Omit<AppearanceProviderProps, 'children'> } = {},
): RenderResult {
  return render(
    <I18nextProvider i18n={createI18n(locale)}>
      <AppearanceProvider {...appearance}>{ui}</AppearanceProvider>
    </I18nextProvider>,
  );
}
