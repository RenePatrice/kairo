import { GlassSurface } from '@kairo/ui';
import { useTranslation } from 'react-i18next';

/** Onglet du Budget encore en construction (étapes suivantes). */
export function SoonTab({ title }: { title: string }) {
  const { t } = useTranslation('app');
  return (
    <div className="flex flex-col gap-4 desktop:mx-auto desktop:max-w-160">
      <h1 className="headline text-hero">{title}</h1>
      <GlassSurface className="rounded-card p-4 text-body text-ink2">
        {t('budget.soonTab')}
      </GlassSurface>
    </div>
  );
}
