import { updateSettings, useDb, type LocaleName } from '@kairo/db';
import { Button, GlassSurface, Pressable } from '@kairo/ui';
import { useTranslation } from 'react-i18next';
import { KairoMark } from '../../components/KairoMark';
import { useAppData } from '../../lib/data';
import { useUi } from '../../store';

const OPTIONS: ReadonlyArray<{ code: LocaleName; short: string }> = [
  { code: 'fr', short: 'FR' },
  { code: 'en', short: 'EN' },
];

/** Premier écran : choix de la langue (la maquette l'affiche en bilingue). */
export function LangScreen() {
  const { t } = useTranslation('app');
  const db = useDb();
  const { settings } = useAppData();
  const go = useUi((s) => s.go);
  const current = settings.locale ?? 'fr';

  return (
    <div className="flex min-h-[40rem] flex-col justify-center gap-5.5">
      <div className="self-center">
        <KairoMark />
      </div>
      <h1 className="headline text-center text-splash tracking-[-0.06em]">kairo</h1>
      <p className="m-0 text-center font-serif text-title italic text-ink2">{t('lang.prompt')}</p>
      <div role="radiogroup" aria-label={t('lang.prompt')} className="mt-1.5 flex flex-col gap-2.5">
        {OPTIONS.map((o) => {
          const on = current === o.code;
          return (
            <GlassSurface
              key={o.code}
              className="rounded-card border-2"
              style={{ borderColor: on ? 'var(--k-acc)' : 'var(--k-line)' }}
            >
              <Pressable
                haptic
                role="radio"
                aria-checked={on}
                onClick={() => void updateSettings(db, { locale: o.code })}
                className="flex w-full items-center gap-4 rounded-card px-5 py-4.5 text-left"
              >
                <span
                  className={`flex size-11.5 items-center justify-center rounded-chip mono-num text-chip font-semibold ${
                    on ? 'bg-inv text-inv-ink' : 'bg-card text-ink'
                  }`}
                >
                  {o.short}
                </span>
                <span className="flex flex-1 flex-col gap-0.5">
                  <span className="text-lead font-bold">{t(`lang.${o.code}.name`)}</span>
                  <span className="text-small text-ink3">{t(`lang.${o.code}.sub`)}</span>
                </span>
                <span
                  aria-hidden="true"
                  className="size-6 rounded-pill border-2"
                  style={{
                    borderColor: on ? 'var(--k-acc)' : 'var(--k-line)',
                    background: on ? 'var(--k-acc)' : 'transparent',
                  }}
                />
              </Pressable>
            </GlassSurface>
          );
        })}
      </div>
      <Button
        className="mt-2 h-14.5 text-input"
        onClick={async () => {
          await updateSettings(db, { locale: current });
          go(settings.started ? 'today' : 'welcome');
        }}
      >
        {t('lang.cta')}
      </Button>
    </div>
  );
}
