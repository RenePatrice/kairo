import { updateProfile, useDb } from '@kairo/db';
import { Button, Field, FieldLabel } from '@kairo/ui';
import { useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { OnboardingStep, StepDots } from '../../components/Onboarding';
import { useAppData } from '../../lib/data';
import { useUi } from '../../store';

/** Accueil, étape 1 : « Ton temps, à ta façon. » — prénom (obligatoire) et métier (facultatif). */
export function WelcomeStep() {
  const { t } = useTranslation('app');
  const db = useDb();
  const { settings } = useAppData();
  const go = useUi((s) => s.go);
  const [name, setName] = useState(settings.profile.name);
  const [role, setRole] = useState(settings.profile.role);
  const [missing, setMissing] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const errorId = useId();

  const next = async () => {
    const first = name.trim();
    if (!first) {
      setMissing(true);
      nameInput.current?.focus();
      return;
    }
    await updateProfile(db, { name: first, role: role.trim() });
    go('rhythm');
  };

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
          ref={nameInput}
          value={name}
          maxLength={60}
          required
          autoComplete="given-name"
          aria-invalid={missing}
          aria-describedby={missing ? errorId : undefined}
          className={missing ? 'border-danger' : ''}
          onChange={(e) => {
            setName(e.target.value);
            if (e.target.value.trim()) setMissing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void next();
          }}
          placeholder={t('welcome.namePh')}
        />
      </FieldLabel>
      {missing ? (
        <p id={errorId} role="alert" className="-mt-2 m-0 text-small font-semibold text-alert">
          {t('welcome.nameRequired')}
        </p>
      ) : null}
      <FieldLabel label={t('welcome.role')}>
        <Field
          value={role}
          maxLength={80}
          onChange={(e) => setRole(e.target.value)}
          placeholder={t('welcome.rolePh')}
        />
      </FieldLabel>
      <Button className="h-14.5 text-input" onClick={() => void next()}>
        {t('common.continue')} <span aria-hidden="true">→</span>
      </Button>
    </OnboardingStep>
  );
}
