import { updateProfile, useDb } from '@kairo/db';
import { Button, Field, FieldLabel } from '@kairo/ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { OnboardingStep, StepDots } from '../../components/Onboarding';
import { useAppData } from '../../lib/data';
import { useUi } from '../../store';

/** Accueil, étape 1 : « Ton temps, à ta façon. » — prénom et métier (facultatif). */
export function WelcomeStep() {
  const { t } = useTranslation('app');
  const db = useDb();
  const { settings } = useAppData();
  const go = useUi((s) => s.go);
  const [name, setName] = useState(settings.profile.name);
  const [role, setRole] = useState(settings.profile.role);

  return (
    <OnboardingStep>
      <StepDots step={0} />
      <div
        aria-hidden="true"
        className="mt-2 size-21 animate-morph iridescent shadow-[0_0_70px_color-mix(in_oklab,var(--k-acc)_50%,transparent)]"
      />
      <h1 className="headline text-splash">
        {t('welcome.titleA')}
        <br />
        <em>{t('welcome.titleB')}</em>
      </h1>
      <p className="m-0 text-input leading-normal text-ink2">{t('welcome.intro')}</p>
      <FieldLabel label={t('welcome.name')}>
        <Field
          value={name}
          maxLength={60}
          autoComplete="given-name"
          onChange={(e) => setName(e.target.value)}
          placeholder={t('welcome.namePh')}
        />
      </FieldLabel>
      <FieldLabel label={t('welcome.role')}>
        <Field
          value={role}
          maxLength={80}
          onChange={(e) => setRole(e.target.value)}
          placeholder={t('welcome.rolePh')}
        />
      </FieldLabel>
      <Button
        className="h-14.5 text-input"
        onClick={async () => {
          await updateProfile(db, { name: name.trim(), role: role.trim() });
          go('rhythm');
        }}
      >
        {t('common.continue')} <span aria-hidden="true">→</span>
      </Button>
    </OnboardingStep>
  );
}
