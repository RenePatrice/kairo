import { Stepper } from '@kairo/ui';
import { useTranslation } from 'react-i18next';

const MAX_GOAL_H = 80;

/** « Objectif par semaine » : 0 h (libre) à 80 h. */
export function GoalStepper({ value, onChange }: { value: number; onChange: (h: number) => void }) {
  const { t } = useTranslation('app');
  return (
    <div className="flex items-center justify-between">
      <span className="flex flex-col gap-0.5">
        <span className="label-mono">{t('acts.weeklyGoal')}</span>
        <span className="num text-display" aria-live="polite">
          {value ? t('common.hoursShort', { h: value }) : t('common.free')}
        </span>
      </span>
      <span className="flex gap-2">
        <Stepper aria-label={t('acts.goalMinus')} onClick={() => onChange(Math.max(0, value - 1))}>
          {t('common.minus')}
        </Stepper>
        <Stepper
          aria-label={t('acts.goalPlus')}
          onClick={() => onChange(Math.min(MAX_GOAL_H, value + 1))}
        >
          {t('common.plus')}
        </Stepper>
      </span>
    </div>
  );
}
