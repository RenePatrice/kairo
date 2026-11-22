import { minuteOfDay, nowAndNext } from '@kairo/core';
import {
  Dock,
  Toast,
  ambientColors,
  breakpoints,
  riseIn,
  transitionFor,
  useAppearance,
  useMediaQuery,
  type DockTab,
} from '@kairo/ui';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppData } from '../lib/data';
import { useNow } from '../lib/useNow';
import { ActivitiesStep } from '../screens/onboarding/ActivitiesStep';
import { LangScreen } from '../screens/onboarding/LangScreen';
import { RhythmStep } from '../screens/onboarding/RhythmStep';
import { WelcomeStep } from '../screens/onboarding/WelcomeStep';
import { SettingsScreen } from '../screens/SettingsScreen';
import { StatsScreen } from '../screens/StatsScreen';
import { TodayScreen } from '../screens/TodayScreen';
import { WeekScreen } from '../screens/WeekScreen';
import { Overlays } from './Overlays';
import { Halos } from './Halos';
import { useUi, type Screen } from '../store';

const ONBOARDING: readonly Screen[] = ['lang', 'welcome', 'rhythm', 'acts'];

function screenFor(screen: Screen): ReactNode {
  switch (screen) {
    case 'lang':
      return <LangScreen />;
    case 'welcome':
      return <WelcomeStep />;
    case 'rhythm':
      return <RhythmStep />;
    case 'acts':
      return <ActivitiesStep />;
    case 'today':
      return <TodayScreen />;
    case 'week':
      return <WeekScreen />;
    case 'stats':
      return <StatsScreen />;
    case 'me':
      return <SettingsScreen />;
  }
}

export function Shell({ screen }: { screen: Screen }) {
  const { t } = useTranslation('app');
  const { reduceMotion } = useAppearance();
  const { blocks, categoryOf } = useAppData();
  const desktop = useMediaQuery(`(min-width: ${breakpoints.desktop}px)`);
  const toast = useUi((s) => s.toast);
  const clearToast = useUi((s) => s.clearToast);
  const go = useUi((s) => s.go);
  const setAssistant = useUi((s) => s.setAssistant);
  const now = useNow(30_000);
  const showDock = !ONBOARDING.includes(screen);

  const halo = useMemo(() => {
    const cur = screen === 'today' ? nowAndNext(blocks, now).current : null;
    return ambientColors(minuteOfDay(now), cur ? categoryOf(cur.slot.categoryId).color : undefined);
  }, [screen, blocks, now, categoryOf]);

  const tabs: DockTab[] = [
    { id: 'today', label: t('nav.today'), icon: 'today' },
    { id: 'week', label: t('nav.week'), icon: 'week' },
    { id: 'stats', label: t('nav.stats'), icon: 'stats' },
    { id: 'me', label: t('nav.me'), icon: 'me' },
  ];
  const dock = (
    <Dock
      tabs={tabs}
      current={screen}
      onSelect={(id) => go(id as Screen)}
      onAssistant={() => setAssistant(true)}
      className={desktop ? 'py-4' : 'py-1.5'}
    />
  );

  return (
    <div className="relative isolate min-h-dvh">
      <Halos colors={halo} />
      <div className="desktop:flex desktop:gap-6">
        {showDock && desktop ? (
          <aside className="sticky top-0 flex h-dvh w-60 flex-none flex-col justify-center pl-4">
            {dock}
          </aside>
        ) : null}
        <main
          className={`relative mx-auto w-full px-5 pt-14 ${
            showDock ? 'pb-44 desktop:pb-16' : 'pb-16'
          } ${ONBOARDING.includes(screen) ? 'max-w-120' : 'max-w-280'}`}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={screen}
              initial={reduceMotion ? { opacity: 0 } : riseIn.initial}
              animate={riseIn.animate}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              transition={{ ...transitionFor('screen', reduceMotion), opacity: { duration: 0.25 } }}
            >
              {screenFor(screen)}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {showDock && !desktop ? (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-x-0 bottom-0 z-20 h-37.5 bg-[linear-gradient(180deg,transparent,var(--k-bg)_72%)]"
          />
          <div className="fixed inset-x-4.5 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-30">
            {dock}
          </div>
        </>
      ) : null}

      <Toast
        message={toast?.message ?? null}
        key={toast?.id}
        onUndo={toast?.action ? () => void toast.action?.() : undefined}
        undoLabel={toast?.actionLabel}
        onClose={clearToast}
        className={`pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4 [&>*]:pointer-events-auto ${
          showDock && !desktop ? 'bottom-[calc(7rem+env(safe-area-inset-bottom))]' : 'bottom-8'
        }`}
      />
      <Overlays />
    </div>
  );
}
