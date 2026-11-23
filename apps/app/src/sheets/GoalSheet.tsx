import { deleteGoal, saveGoal, useDb, useGoals } from '@kairo/db';
import {
  Button,
  Field,
  FieldLabel,
  GlassSurface,
  Pressable,
  Sheet,
  Stepper,
  inkFor,
} from '@kairo/ui';
import { useTranslation } from 'react-i18next';
import { useAppData } from '../lib/data';
import { useFormat } from '../lib/format';
import { useUi, type GoalForm } from '../store';

type Kind = GoalForm['kind'];
const DAY_KINDS: Kind[] = ['blocks', 'hours', 'free'];
const WEEK_KINDS: Kind[] = ['hours', 'rate', 'act'];

/** Fiche « Objectif du jour » / « Cap de la semaine » de la maquette. */
export function GoalSheet() {
  const { t } = useTranslation('app');
  const db = useDb();
  const f = useFormat();
  const { categories } = useAppData();
  const goals = useGoals();
  const open = useUi((s) => s.sheet === 'goal');
  const form = useUi((s) => s.goalForm);
  const patch = useUi((s) => s.patchGoal);
  const close = useUi((s) => s.closeSheet);
  const flash = useUi((s) => s.flash);
  if (!form) return null;

  const day = form.scope === 'D';
  const kinds = day ? DAY_KINDS : WEEK_KINDS;
  const exists = Boolean(goals?.[form.key]);
  const step = form.kind === 'rate' ? 5 : 1;
  const min = form.kind === 'rate' ? 30 : 1;
  const max = form.kind === 'rate' ? 100 : 99;

  const pick = (kind: Kind) =>
    patch({
      kind,
      target:
        kind === 'rate'
          ? 80
          : kind === 'blocks'
            ? Math.max(1, form.blocksDefault || 3)
            : kind === 'free'
              ? 0
              : day
                ? 2
                : Math.max(1, form.hoursDefault || 10),
      categoryId: kind === 'act' ? (form.categoryId ?? categories[0]?.id ?? null) : form.categoryId,
    });

  const value =
    form.kind === 'rate'
      ? t('goal.rateValue', { n: form.target })
      : form.kind === 'blocks'
        ? t('goal.slots', { count: form.target })
        : t('goal.hoursValue', { n: form.target });
  const hint =
    form.kind === 'rate'
      ? t('goal.hintRate')
      : form.kind === 'blocks'
        ? day
          ? t('goal.hintBlocks', { n: form.blocksDefault })
          : ''
        : t('goal.hintPlanned', {
            hours: f.hours(day ? form.plannedMin : form.hoursDefault * 60),
          });

  const save = async () => {
    const text = form.text.trim();
    if (
      form.scope === 'D' &&
      (form.kind === 'blocks' || form.kind === 'hours' || form.kind === 'free')
    ) {
      await saveGoal(db, { id: form.key, scope: 'D', kind: form.kind, target: form.target, text });
    } else if (
      form.scope === 'W' &&
      (form.kind === 'hours' || form.kind === 'rate' || form.kind === 'act')
    ) {
      await saveGoal(db, {
        id: form.key,
        scope: 'W',
        kind: form.kind,
        target: form.target,
        categoryId: form.kind === 'act' ? form.categoryId : null,
        text,
      });
    }
    close();
    flash(day ? t('goal.savedDay') : t('goal.savedWeek'));
  };

  const remove = async () => {
    await deleteGoal(db, form.key);
    close();
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => (o ? null : close())}
      label={t('goal.dialog')}
      title={
        <>
          {day ? t('goal.titleDayA') : t('goal.titleWeekA')}{' '}
          <em>{day ? t('goal.titleDayB') : t('goal.titleWeekB')}</em>
        </>
      }
    >
      <GlassSurface className="grid grid-cols-3 gap-1 rounded-row p-1">
        {kinds.map((k) => (
          <Pressable
            key={k}
            onClick={() => pick(k)}
            aria-pressed={form.kind === k}
            className={`h-11 rounded-step text-small font-semibold ${
              form.kind === k ? 'bg-inv text-inv-ink' : 'text-ink2'
            }`}
          >
            {t(`goal.kinds.${k}`)}
          </Pressable>
        ))}
      </GlassSurface>

      {form.kind === 'act' ? (
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const on = form.categoryId === c.id;
            return (
              <Pressable
                key={c.id}
                onClick={() => patch({ categoryId: c.id })}
                aria-pressed={on}
                className="h-11 rounded-pill border px-3.5 text-small font-semibold"
                style={{
                  background: on ? c.color : 'var(--k-card)',
                  color: on ? inkFor(c.color) : 'var(--k-ink)',
                  borderColor: on ? c.color : 'var(--k-line)',
                }}
              >
                {c.name}
              </Pressable>
            );
          })}
        </div>
      ) : null}

      {form.kind !== 'free' ? (
        <GlassSurface className="flex items-center justify-between rounded-slot px-4 py-3.5">
          <span className="flex flex-col gap-0.5">
            <span className="label-mono">{t('goal.target')}</span>
            <span className="num text-hero" aria-live="polite">
              {value}
            </span>
            {hint ? <span className="mono-num text-label text-ink3">{hint}</span> : null}
          </span>
          <span className="flex gap-2">
            <Stepper
              aria-label={t('goal.minus')}
              onClick={() => patch({ target: Math.max(min, form.target - step) })}
            >
              −
            </Stepper>
            <Stepper
              aria-label={t('goal.plus')}
              onClick={() => patch({ target: Math.min(max, form.target + step) })}
            >
              +
            </Stepper>
          </span>
        </GlassSurface>
      ) : null}

      <FieldLabel label={t('goal.intention')}>
        <Field
          value={form.text}
          maxLength={120}
          onChange={(e) => patch({ text: e.target.value })}
          placeholder={day ? t('goal.placeholderDay') : t('goal.placeholderWeek')}
        />
      </FieldLabel>

      <div className="flex gap-2.5">
        <Button className="h-14 flex-[2] text-input" onClick={() => void save()}>
          {t('goal.save')}
        </Button>
        {exists ? (
          <Button variant="danger" className="h-14 flex-1" onClick={() => void remove()}>
            {t('goal.remove')}
          </Button>
        ) : null}
      </div>
    </Sheet>
  );
}
