import { GlassSurface } from '@kairo/ui';
import { useTranslation } from 'react-i18next';

/**
 * Onglet Bilans. Les graphiques, bilans et trophées de la maquette arrivent en Phase 2 ;
 * en attendant, l'état « Tes stats arrivent » de la maquette.
 */
export function StatsScreen() {
  const { t } = useTranslation('app');
  return (
    <div className="flex flex-col gap-4 desktop:mx-auto desktop:max-w-160">
      <span className="eyebrow">{t('stats.eyebrow')}</span>
      <h1 className="headline text-hero">
        {t('stats.titleA')} <em>{t('stats.titleB')}</em>.
      </h1>
      <GlassSurface className="flex flex-col gap-3 rounded-panel p-5.5">
        <span className="text-title font-bold tracking-snug">
          {t('stats.emptyA')}{' '}
          <span className="font-serif text-serif font-normal italic text-acc-text">
            {t('stats.emptyB')}
          </span>
          .
        </span>
        <span className="text-body leading-normal text-ink2">{t('stats.emptyBody')}</span>
      </GlassSurface>
    </div>
  );
}
