import { addCategory, deleteCategory, updateSettings, useDb } from '@kairo/db';
import { Button, Field, GlassSurface, inkFor, Pressable } from '@kairo/ui';
import { useTranslation } from 'react-i18next';
import { OnboardingStep, StepDots } from '../../components/Onboarding';
import { GoalStepper } from '../../components/GoalStepper';
import { Swatches } from '../../components/Swatches';
import { useAppData } from '../../lib/data';
import { emptyActForm, useUi } from '../../store';

/** Accueil, étape 3 : « Qu'est-ce qui compte pour toi ? » — activités, couleurs, objectifs. */
export function ActivitiesStep() {
  const { t } = useTranslation('app');
  const db = useDb();
  const { categories } = useAppData();
  const form = useUi((s) => s.actForm);
  const patch = useUi((s) => s.patchAct);
  const setForm = useUi((s) => s.setActForm);
  const flash = useUi((s) => s.flash);
  const go = useUi((s) => s.go);
  const name = form.name.trim();
  const preview = name ? name.charAt(0).toUpperCase() + name.slice(1) : t('acts.fallback');

  const add = async () => {
    if (!name) {
      flash(t('acts.nameRequired'));
      return;
    }
    await addCategory(db, { name, color: form.color, weeklyGoalH: form.weeklyGoalH });
    setForm(emptyActForm(categories.length + 1));
  };

  const finish = async () => {
    if (!categories.length) {
      flash(t('acts.needOne'));
      return;
    }
    await updateSettings(db, { started: true });
    go('week');
    flash(t('acts.placeSlots'));
  };

  return (
    <OnboardingStep gap="gap-4.5">
      <StepDots step={2} />
      <h1 className="headline text-numeral">
        {t('acts.titleA')}
        <br />
        <em>{t('acts.titleB')}</em> {t('acts.titleC')}
      </h1>
      <p className="m-0 text-body leading-normal text-ink2">{t('acts.intro')}</p>
      <GlassSurface className="flex flex-col gap-3.5 rounded-panel p-4.5">
        <Field
          value={form.name}
          maxLength={60}
          onChange={(e) => patch({ name: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void add();
          }}
          placeholder={t('acts.name')}
          aria-label={t('acts.name')}
        />
        <Swatches value={form.color} onChange={(color) => patch({ color })} />
        <GoalStepper value={form.weeklyGoalH} onChange={(weeklyGoalH) => patch({ weeklyGoalH })} />
        <Button
          onClick={() => void add()}
          style={{ background: form.color, color: inkFor(form.color) }}
        >
          {t('acts.addPrefix')} {preview}
        </Button>
      </GlassSurface>
      {categories.length ? (
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {categories.map((c) => (
            <li key={c.id}>
              <GlassSurface className="flex items-center gap-2 rounded-tile py-1.5 pl-3 pr-1 text-chip font-semibold">
                <span
                  aria-hidden="true"
                  className="size-2.5 rounded-pill"
                  style={{ background: c.color, boxShadow: `0 0 10px ${c.color}` }}
                />
                {c.name}
                <span className="mono-num text-label text-ink3">
                  {c.weeklyGoalH
                    ? t('common.perWeek', { h: c.weeklyGoalH })
                    : t('common.freeLower')}
                </span>
                <Pressable
                  aria-label={t('common.remove', { name: c.name })}
                  onClick={() => void deleteCategory(db, c.id)}
                  className="-my-2 flex size-11 items-center justify-center rounded-pill text-ink3"
                >
                  {t('common.times')}
                </Pressable>
              </GlassSurface>
            </li>
          ))}
        </ul>
      ) : null}
      <Button
        className="h-14.5 text-input"
        style={{ opacity: categories.length ? 1 : 0.45 }}
        onClick={() => void finish()}
      >
        {categories.length ? t('acts.finish') : t('acts.needOne')}
      </Button>
    </OnboardingStep>
  );
}
