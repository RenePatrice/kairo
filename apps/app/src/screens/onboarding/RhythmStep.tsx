import { awakeBars, awakeMinutes, sleepMinutes, stepMinute } from '@kairo/core';
import { updateProfile, useDb } from '@kairo/db';
import { Button, GlassSurface, Stepper } from '@kairo/ui';
import { useTranslation } from 'react-i18next';
import { OnboardingStep, StepDots } from '../../components/Onboarding';
import { useAppData } from '../../lib/data';
import { useFormat } from '../../lib/format';
import { useUi } from '../../store';

/** Accueil, étape 2 : réveil et coucher (aussi ouvert depuis les Réglages). */
export function RhythmStep() {
  const { t } = useTranslation('app');
  const db = useDb();
  const { settings } = useAppData();
  const f = useFormat();
  const go = useUi((s) => s.go);
  const p = settings.profile;
  const rhythm = { wakeMin: p.wakeMin, sleepMin: p.sleepMin };

  const row = (
    label: string,
    minute: number,
    key: 'wakeMin' | 'sleepMin',
    earlier: string,
    later: string,
  ) => (
    <div className="flex items-center justify-between">
      <span className="flex flex-col gap-1">
        <span className="label-mono">{label}</span>
        <span className="num text-numeral" aria-live="polite">
          {f.clock(minute)}
        </span>
      </span>
      <span className="flex gap-2">
        <Stepper
          aria-label={earlier}
          onClick={() => void updateProfile(db, { [key]: stepMinute(minute, -1) })}
        >
          {t('common.minus')}
        </Stepper>
        <Stepper
          aria-label={later}
          onClick={() => void updateProfile(db, { [key]: stepMinute(minute, 1) })}
        >
          {t('common.plus')}
        </Stepper>
      </span>
    </div>
  );

  return (
    <OnboardingStep>
      <StepDots step={1} />
      <h1 className="headline text-numeral">
        {t('rhythm.titleA')} <em>{t('rhythm.titleB')}</em>
        {p.name ? `, ${p.name}.` : '.'}
      </h1>
      <p className="m-0 text-body leading-normal text-ink2">{t('rhythm.intro')}</p>
      <GlassSurface className="flex flex-col gap-5 rounded-panel p-5.5">
        {row(
          t('rhythm.wake'),
          p.wakeMin,
          'wakeMin',
          t('rhythm.wakeEarlier'),
          t('rhythm.wakeLater'),
        )}
        {row(
          t('rhythm.sleep'),
          p.sleepMin,
          'sleepMin',
          t('rhythm.sleepEarlier'),
          t('rhythm.sleepLater'),
        )}
        <div aria-hidden="true" className="relative h-4 overflow-hidden rounded-block bg-track">
          <span className="absolute inset-0 stripes" />
          {awakeBars(rhythm).map((b) => (
            <span
              key={b.left}
              className="absolute inset-y-0 bg-[linear-gradient(90deg,var(--color-act-miel),var(--color-act-pivoine),var(--color-act-lavande))]"
              style={{ left: `${b.left}%`, width: `${b.width}%` }}
            />
          ))}
        </div>
        <div aria-hidden="true" className="flex justify-between mono-num text-micro text-ink3">
          {['00', '06', '12', '18', '24'].map((h) => (
            <span key={h}>{h}</span>
          ))}
        </div>
        <div className="text-body text-ink2">
          <span className="font-bold text-ink">{f.duration(awakeMinutes(rhythm))}</span>{' '}
          {t('rhythm.awake')}{' '}
          <span className="font-serif text-lead italic text-acc-text">
            {f.duration(sleepMinutes(rhythm))} {t('rhythm.ofSleep')}
          </span>
        </div>
      </GlassSurface>
      <Button className="h-14.5 text-input" onClick={() => go(settings.started ? 'me' : 'acts')}>
        {t('common.continue')} <span aria-hidden="true">→</span>
      </Button>
    </OnboardingStep>
  );
}
