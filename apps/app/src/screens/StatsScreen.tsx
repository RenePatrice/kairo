import { GlassSurface, Pressable } from '@kairo/ui';
import { useTranslation } from 'react-i18next';
import { useBilans } from '../lib/bilans';
import { useNow } from '../lib/useNow';
import { useUi, type StatTab } from '../store';
import { DayTab } from './stats/DayTab';
import { TrophyTab } from './stats/TrophyTab';
import { WeekTab } from './stats/WeekTab';

const TABS: StatTab[] = ['day', 'week', 'trophy'];

/** Onglet Bilans de la maquette : Jour, Semaine (par défaut) et Trophées. */
export function StatsScreen() {
  const { t } = useTranslation('app');
  const now = useNow(60_000);
  const tab = useUi((s) => s.statTab);
  const setTab = useUi((s) => s.setStatTab);
  const data = useBilans(now);

  return (
    <div className="flex flex-col gap-4 desktop:mx-auto desktop:max-w-160">
      <span className="eyebrow">{t('stats.eyebrow')}</span>
      <h1 className="headline text-hero">
        {t('stats.titleA')} <em>{t('stats.titleB')}</em>.
      </h1>
      <GlassSurface
        role="group"
        aria-label={t('stats.eyebrow')}
        className="grid grid-cols-3 gap-1 rounded-tile p-1"
      >
        {TABS.map((id) => (
          <Pressable
            key={id}
            onClick={() => setTab(id)}
            aria-pressed={tab === id}
            className={`h-11 rounded-field text-chip font-semibold ${
              tab === id ? 'bg-inv text-inv-ink' : 'text-ink2'
            }`}
          >
            {t(`stats.tabs.${id}`)}
          </Pressable>
        ))}
      </GlassSurface>
      {tab === 'day' ? <DayTab data={data} /> : null}
      {tab === 'week' ? <WeekTab now={now} data={data} /> : null}
      {tab === 'trophy' ? <TrophyTab data={data} /> : null}
    </div>
  );
}

export type BilansData = ReturnType<typeof useBilans>;
