/** Formatage selon la langue et le format 12/24 h choisis. Les calculs restent dans @kairo/core. */
import {
  daysPreset,
  formatClock,
  formatDuration,
  formatHours,
  type ClockFormat,
  type Locale,
} from '@kairo/core';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppData } from './data';

export interface Format {
  locale: Locale;
  clockFormat: ClockFormat;
  clock: (minute: number) => string;
  duration: (minutes: number) => string;
  hours: (minutes: number) => string;
  dayName: (index: number) => string;
  dayLetter: (index: number) => string;
  month: (index: number) => string;
  daysText: (days: readonly number[]) => string;
  /** « lundi » en français, « Monday » en anglais (dans une phrase). */
  dayInSentence: (index: number) => string;
}

export function useFormat(): Format {
  const { t, i18n } = useTranslation('app');
  const { settings } = useAppData();
  const locale: Locale = i18n.language === 'en' ? 'en' : 'fr';
  const clockFormat: ClockFormat = settings.options.clock12 ? '12h' : '24h';

  const dayName = useCallback((i: number) => t(`days.full.${i}`), [t]);
  const clock = useCallback((m: number) => formatClock(m, clockFormat), [clockFormat]);

  return useMemo<Format>(
    () => ({
      locale,
      clockFormat,
      clock,
      duration: formatDuration,
      hours: (m) => formatHours(m, locale),
      dayName,
      dayLetter: (i) => t(`days.letter.${i}`),
      month: (i) => t(`months.${i}`),
      dayInSentence: (i) => (locale === 'fr' ? dayName(i).toLowerCase() : dayName(i)),
      daysText: (days) => {
        const preset = daysPreset(days);
        if (preset !== 'custom') return t(`days.${preset}`);
        return [...days]
          .sort((a, b) => a - b)
          .map((d) => dayName(d).slice(0, 3))
          .join(' · ');
      },
    }),
    [locale, clockFormat, clock, dayName, t],
  );
}
