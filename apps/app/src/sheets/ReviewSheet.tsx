import {
  addDays,
  dayGoalProgress,
  dayReview,
  doneOn,
  firstCheckDay,
  isoWeek,
  isoWeekday,
  startOfWeek,
  weekKey,
  weekLoads,
  weekReview,
} from '@kairo/core';
import { saveGoal, saveReview, useDb, useEnergy, useGoals } from '@kairo/db';
import {
  Button,
  Field,
  FieldLabel,
  GlassSurface,
  Icon,
  Pressable,
  Sheet,
  activityPalette,
  moodColors,
  status,
  withAlpha,
} from '@kairo/ui';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toDayGoal, toWeekGoal } from '../lib/bilans';
import { useAppData } from '../lib/data';
import { useFormat } from '../lib/format';
import { dayReviewText, goalText, weekReviewText } from '../lib/reviewText';
import { useUi } from '../store';

const HOT = activityPalette.find((c) => c.key === 'abricot')?.hex ?? status.warning;

/** Fiche « Bilan du jour » / « Bilan de la semaine » de la maquette. */
export function ReviewSheet() {
  const { t } = useTranslation('app');
  const db = useDb();
  const f = useFormat();
  const { blocks, checks, restDays, categoryOf } = useAppData();
  const liveEnergy = useEnergy();
  const energy = useMemo(() => liveEnergy ?? {}, [liveEnergy]);
  const goals = useGoals();
  const open = useUi((s) => s.sheet === 'review');
  const form = useUi((s) => s.reviewForm);
  const patch = useUi((s) => s.patchReview);
  const close = useUi((s) => s.closeSheet);
  const flash = useUi((s) => s.flash);
  if (!form) return null;

  const now = new Date();
  const date = new Date(form.date);
  const day = form.scope === 'D';
  const history = { checks, restDays, since: firstCheckDay(checks) };
  const input = { slots: blocks, history, energy, now };
  const nameOf = (id: string) => categoryOf(id).name;
  const goal = goals?.[form.key];
  const moods = t('stats.moods', { returnObjects: true }) as string[];
  const levels = t('reviewSheet.energyLevels', { returnObjects: true }) as string[];

  let stats: Array<{ v: string; l: string; c?: string }>;
  let goalLine: { text: string; ok: boolean | null } | null = null;
  if (day) {
    const facts = dayReview(date, input, toDayGoal(goal));
    stats = [
      { v: `${facts.done}/${facts.due}`, l: t('reviewSheet.slots') },
      { v: f.hours(facts.doneMin), l: t('reviewSheet.done') },
      {
        v: facts.energy ? (levels[Math.round(facts.energy) - 1] ?? '–') : '–',
        l: t('reviewSheet.energy'),
        c: facts.energy > 2.4 ? HOT : undefined,
      },
    ];
    if (goal) {
      const progress = dayGoalProgress(toDayGoal(goal), doneOn(blocks, date, checks));
      const ok = progress === null ? null : progress >= 1;
      const tail =
        progress === null
          ? ''
          : ok
            ? t('reviewSheet.reached')
            : t('reviewSheet.pct', { n: Math.round(progress * 100) });
      goalLine = { text: t('reviewSheet.goalDay', { text: goalText(goal, t, nameOf) }) + tail, ok };
    }
  } else {
    const facts = weekReview(date, input, toWeekGoal(goal));
    stats = [
      { v: f.hours(facts.totalMin), l: t('reviewSheet.done') },
      {
        v: facts.due ? `${Math.round(facts.ratio * 100)}%` : '–',
        l: t('reviewSheet.rate'),
        c: status.success,
      },
      {
        v: facts.bestDay === null ? '–' : `${f.dayName(facts.bestDay).slice(0, 3)}.`,
        l: t('reviewSheet.bestDay'),
        c: 'var(--k-acc-text)',
      },
    ];
    if (goal?.scope === 'W') {
      const cap =
        goal.text ||
        (goal.kind === 'rate'
          ? t('reviewSheet.capRate', { n: goal.target })
          : t('reviewSheet.capHours', { n: goal.target }));
      goalLine = {
        text:
          t('reviewSheet.goalWeek', { text: cap }) +
          (facts.goalReached ? t('reviewSheet.reached') : t('reviewSheet.notYet')),
        ok: facts.goalReached,
      };
    }
  }

  /** « Laisser l'IA rédiger le bilan » : brouillon tiré des faits de core, modifiable. */
  const draft = () => {
    if (day) {
      const facts = dayReview(date, input, toDayGoal(goal));
      patch({ mood: facts.mood, ...dayReviewText(facts, t, f, nameOf), ai: true });
      return;
    }
    const facts = weekReview(date, input, toWeekGoal(goal));
    const text = weekReviewText(facts, t, f, nameOf);
    patch({
      mood: facts.mood,
      a: text.a,
      b: text.b,
      summary: text.summary,
      next: text.next,
      ai: true,
      nextGoal: {
        kind: facts.nextGoal.kind,
        target: facts.nextGoal.target,
        categoryId: facts.nextGoal.categoryId ?? null,
        text: text.next,
      },
    });
  };

  const save = async () => {
    if (!form.mood) return flash(t('reviewSheet.needMood'));
    await saveReview(db, {
      id: form.key,
      mood: form.mood,
      a: form.a,
      b: form.b,
      summary: form.summary,
      ai: form.ai,
    });
    const next = form.next.trim();
    if (!day && next) {
      const nextKey = weekKey(addDays(date, 7));
      const current = goal?.scope === 'W' ? goal : undefined;
      const plannedH = Math.max(
        1,
        Math.round(weekLoads(blocks, startOfWeek(date)).reduce((a, b) => a + b, 0) / 60),
      );
      const g =
        form.ai && form.nextGoal && next === form.nextGoal.text
          ? form.nextGoal
          : current
            ? {
                kind: current.kind,
                target: current.target,
                categoryId: current.categoryId,
                text: next,
              }
            : { kind: 'hours' as const, target: plannedH, categoryId: null, text: next };
      await saveGoal(db, { id: nextKey, scope: 'W', ...g });
    }
    close();
    flash(day ? t('reviewSheet.savedDay') : t('reviewSheet.savedWeek'));
  };

  const eyebrow = day
    ? `${f.dayName(isoWeekday(date))} ${date.getDate()} ${f.month(date.getMonth())}`
    : t('reviewSheet.weekEyebrow', { n: isoWeek(date).week });

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => (o ? null : close())}
      label={t('reviewSheet.dialog')}
      description={eyebrow}
      title={
        <>
          {day ? t('reviewSheet.titleDayA') : t('reviewSheet.titleWeekA')}{' '}
          <em>{day ? t('reviewSheet.titleDayB') : t('reviewSheet.titleWeekB')}</em>
        </>
      }
    >
      <div className="grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <GlassSurface key={s.l} className="flex flex-col gap-0.5 rounded-row p-3">
            <span className="num text-title" style={s.c ? { color: s.c } : undefined}>
              {s.v}
            </span>
            <span className="label-mono text-tiny">{s.l}</span>
          </GlassSurface>
        ))}
      </div>

      <Pressable onClick={draft} className="relative h-13 rounded-pill p-[1.5px]">
        <span
          aria-hidden="true"
          className="absolute inset-0 animate-spin-iri rounded-pill iridescent"
        />
        <span className="relative flex h-full items-center justify-center gap-2 rounded-pill bg-bg2 text-body font-semibold">
          <Icon name="sparkle" size={18} />
          {form.ai ? t('reviewSheet.regenerate') : t('reviewSheet.auto')}
        </span>
      </Pressable>

      {form.summary ? (
        <GlassSurface className="flex flex-col gap-1.5 rounded-tile px-4 py-3.5">
          <span className="label-mono text-acc-text">{t('reviewSheet.aiAnalysis')}</span>
          <span className="text-chip leading-normal text-ink2">{form.summary}</span>
        </GlassSurface>
      ) : null}

      {goalLine ? (
        <div
          className="rounded-field px-3.5 py-3 text-chip font-semibold"
          style={{
            background:
              goalLine.ok === true
                ? withAlpha(status.success, 0.16)
                : goalLine.ok === false
                  ? withAlpha(status.danger, 0.14)
                  : 'var(--k-track)',
            color:
              goalLine.ok === true
                ? 'var(--k-ink)'
                : goalLine.ok === false
                  ? status.danger
                  : 'var(--k-ink2)',
          }}
        >
          {goalLine.text}
        </div>
      ) : null}

      <div
        className="flex flex-col gap-2.5"
        role="group"
        aria-label={day ? t('reviewSheet.moodDay') : t('reviewSheet.moodWeek')}
      >
        <span className="label-mono">
          {day ? t('reviewSheet.moodDay') : t('reviewSheet.moodWeek')}
        </span>
        <div className="grid grid-cols-5 gap-1.5">
          {moods.map((m, i) => {
            const on = form.mood === i + 1;
            const c = moodColors[i] ?? moodColors[2];
            return (
              <Pressable
                key={m}
                onClick={() => patch({ mood: i + 1 })}
                aria-pressed={on}
                className="flex flex-col items-center gap-1.5 rounded-field border px-0.5 py-2.5"
                style={{
                  background: on ? 'var(--k-card)' : 'transparent',
                  borderColor: on ? c : 'var(--k-line)',
                }}
              >
                <span
                  aria-hidden="true"
                  className="rounded-pill transition-all duration-300"
                  style={{
                    width: on ? 26 : 18,
                    height: on ? 26 : 18,
                    background: c,
                    boxShadow: on ? `0 0 16px ${c}` : 'none',
                  }}
                />
                <span className="text-micro font-semibold text-ink2">{m}</span>
              </Pressable>
            );
          })}
        </div>
      </div>

      <FieldLabel label={day ? t('reviewSheet.aDay') : t('reviewSheet.aWeek')}>
        <Field
          value={form.a}
          maxLength={600}
          onChange={(e) => patch({ a: e.target.value })}
          placeholder={day ? t('reviewSheet.aDayPh') : t('reviewSheet.aWeekPh')}
        />
      </FieldLabel>
      <FieldLabel label={day ? t('reviewSheet.bDay') : t('reviewSheet.bWeek')}>
        <Field
          value={form.b}
          maxLength={600}
          onChange={(e) => patch({ b: e.target.value })}
          placeholder={day ? t('reviewSheet.bDayPh') : t('reviewSheet.bWeekPh')}
        />
      </FieldLabel>
      {!day ? (
        <FieldLabel label={t('reviewSheet.next')}>
          <Field
            value={form.next}
            maxLength={120}
            onChange={(e) => patch({ next: e.target.value })}
            placeholder={t('reviewSheet.nextPh')}
          />
        </FieldLabel>
      ) : null}
      <Button className="h-14 text-input" onClick={() => void save()}>
        {t('reviewSheet.save')}
      </Button>
    </Sheet>
  );
}
