import { minuteOfDay, nowAndNext } from '@kairo/core';
import {
  Dock,
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
import { BudgetHome } from '../screens/budget/BudgetHome';
import { BudgetSetup } from '../screens/budget/BudgetSetup';
import { OpsScreen } from '../screens/budget/OpsScreen';
import { SoonTab } from '../screens/budget/SoonTab';
import { ModeSwitch } from '../components/ModeSwitch';
import { useMoneyActions } from '../lib/budget';
import i18next from 'i18next';
import { WeekScreen } from '../screens/WeekScreen';
import { AppToast } from './AppToast';
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
    case 'money':
      return <BudgetHome />;
    case 'ops':
      return <OpsScreen />;
    case 'envelopes':
      return <SoonTab title={i18next.t('app:budget.nav.envelopes')} />;
  }
}

const BUDGET_SCREENS: readonly Screen[] = ['money', 'ops', 'envelopes'];

export function Shell({ screen }: { screen: Screen }) {
  const { t } = useTranslation('app');
  const { reduceMotion } = useAppearance();
  const { blocks, categoryOf, settings } = useAppData();
  const { newTransaction } = useMoneyActions();
  const budget = settings.mode === 'budget';
  // Budget pas encore configuré : l'écran de configuration remplace l'Aperçu.
  const needsSetup = BUDGET_SCREENS.includes(screen) && !settings.currency;
  const desktop = useMediaQuery(`(min-width: ${breakpoints.desktop}px)`);
  const assistantOpen = useUi((s) => s.assistant);
  const go = useUi((s) => s.go);
  const setAssistant = useUi((s) => s.setAssistant);
  const now = useNow(30_000);
  const showDock = !ONBOARDING.includes(screen);

  const halo = useMemo(() => {
    const cur = screen === 'today' ? nowAndNext(blocks, now).current : null;
    return ambientColors(minuteOfDay(now), cur ? categoryOf(cur.slot.categoryId).color : undefined);
  }, [screen, blocks, now, categoryOf]);

  const tabs: DockTab[] = budget
    ? [
        { id: 'money', label: t('budget.nav.money'), icon: 'wallet' },
        { id: 'ops', label: t('budget.nav.ops'), icon: 'list' },
        { id: 'envelopes', label: t('budget.nav.envelopes'), icon: 'pie' },
        { id: 'me', label: t('nav.me'), icon: 'me' },
      ]
    : [
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
      center={
        budget
          ? {
              label: t('budget.nav.add'),
              icon: 'plus',
              onPress: () => (settings.currency ? newTransaction() : go('money')),
            }
          : undefined
      }
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
              {showDock && !needsSetup ? (
                <div className="mb-4 desktop:mx-auto desktop:max-w-160">
                  <ModeSwitch />
                </div>
              ) : null}
              {needsSetup ? <BudgetSetup /> : screenFor(screen)}
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

      {/* Pendant l'assistant, le toast vit dans sa fenêtre (le reste de la page est inerte). */}
      {assistantOpen ? null : (
        <AppToast
          className={
            showDock && !desktop ? 'bottom-[calc(7rem+env(safe-area-inset-bottom))]' : 'bottom-8'
          }
        />
      )}
      <Overlays />
    </div>
  );
}
