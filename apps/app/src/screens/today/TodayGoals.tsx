import {
  dateKey,
  dayGoalProgress,
  dayReview,
  doneOn,
  firstCheckDay,
  minuteOfDay,
  occurrencesOn,
} from '@kairo/core';
import { saveReview, useDb, useEnergy, useGoals, useReviews } from '@kairo/db';
import { Button, GlassSurface, Pressable, moodColors, status } from '@kairo/ui';
import { useTranslation } from 'react-i18next';
import { toDayGoal, useBilanActions } from '../../lib/bilans';
import { useAppData } from '../../lib/data';
import { useFormat } from '../../lib/format';
import { dayReviewText, goalText } from '../../lib/reviewText';
import { useUi } from '../../store';

const CIRC = 2 * Math.PI * 22;
/** Heure à partir de laquelle la maquette propose le bilan du jour (19 h). */
const REVIEW_FROM_MIN = 1140;

/** Objectif du jour et bilan du jour, sous la salutation (maquette : « showGoalsToday »). */
export function TodayGoals({ now }: { now: Date }) {
  const { t } = useTranslation('app');
  const db = useDb();
  const f = useFormat();
  const { settings, blocks, checks, restDays, categoryOf } = useAppData();
  const goals = useGoals();
  const reviews = useReviews();
  const energy = useEnergy();
  const { goalFor, reviewFor } = useBilanActions();
  const flash = useUi((s) => s.flash);
  if (!settings.started || !blocks.length || !goals || !reviews) return null;

  const key = `D${dateKey(now)}`;
  const goal = goals[key];
  const review = reviews[key];
  const done = doneOn(blocks, now, checks);
  const progress = dayGoalProgress(toDayGoal(goal), done);
  const today = occurrencesOn(blocks, now);
  const allEnded = today.length > 0 && today.every((o) => o.end <= now);
  const showPrompt =
    !review && today.length > 0 && (minuteOfDay(now) >= REVIEW_FROM_MIN || allEnded);
  const moods = t('stats.moods', { returnObjects: true }) as string[];

  const aiReview = async () => {
    const facts = dayReview(
      now,
      {
        slots: blocks,
        history: { checks, restDays, since: firstCheckDay(checks) },
        energy: energy ?? {},
        now,
      },
      toDayGoal(goal),
    );
    await saveReview(db, {
      id: key,
      mood: facts.mood,
      ...dayReviewText(facts, t, f, (id) => categoryOf(id).name),
      ai: true,
    });
    flash(t('dayGoal.aiWritten'), t('dayGoal.view'), () => reviewFor('D', now));
  };

  return (
    <div className="flex flex-col gap-2.5">
      {goal ? (
        <GlassSurface className="rounded-card">
          <Pressable
            onClick={() => goalFor('D', now)}
            className="flex w-full items-center gap-3.5 rounded-card px-4 py-3.5 text-left"
          >
            <span className="relative size-14 flex-none">
              <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
                <circle
                  cx="28"
                  cy="28"
                  r="22"
                  fill="none"
                  stroke="var(--k-track)"
                  strokeWidth="6"
                />
                <circle
                  cx="28"
                  cy="28"
                  r="22"
                  fill="none"
                  stroke="var(--k-acc)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${(CIRC * Math.min(1, progress ?? 1)).toFixed(1)} ${CIRC.toFixed(1)}`}
                  transform="rotate(-90 28 28)"
                  style={{ filter: 'drop-shadow(0 0 6px var(--k-acc))' }}
                />
              </svg>
              <span className="num absolute inset-0 flex items-center justify-center text-small">
                {progress === null ? '✦' : `${Math.min(100, Math.round(progress * 100))}%`}
              </span>
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.75">
              <span className="eyebrow">{t('dayGoal.label')}</span>
              <span className="font-serif text-heading leading-tight italic text-ink">
                {goalText(goal, t, (id) => categoryOf(id).name)}
              </span>
              <span className="mono-num text-label text-ink3">
                {goal.kind === 'blocks'
                  ? t('dayGoal.progressBlocks', { done: done.count, target: goal.target })
                  : goal.kind === 'hours'
                    ? t('dayGoal.progressHours', {
                        done: f.hours(done.minutes),
                        target: goal.target,
                      })
                    : t('dayGoal.progressFree', { count: done.count })}
              </span>
            </span>
            {progress !== null && progress >= 1 ? (
              <span
                className="rounded-icon px-2 py-1.25 mono-num text-micro font-semibold"
                style={{ background: status.success, color: status.successInk }}
              >
                {t('dayGoal.reached')}
              </span>
            ) : null}
          </Pressable>
        </GlassSurface>
      ) : (
        <Pressable
          onClick={() => goalFor('D', now)}
          className="flex items-center justify-between gap-2.5 rounded-card border-[1.5px] border-dashed border-line p-4 text-left"
        >
          <span className="flex flex-col gap-0.75">
            <span className="eyebrow">{t('dayGoal.label')}</span>
            <span className="text-body font-semibold">{t('dayGoal.empty')}</span>
          </span>
          <span className="font-serif text-heading italic text-acc-text">{t('dayGoal.set')}</span>
        </Pressable>
      )}

      {showPrompt ? (
        <div className="relative rounded-card p-[1.5px]">
          <span
            aria-hidden="true"
            className="absolute inset-0 animate-spin-iri rounded-card iridescent opacity-70"
          />
          <div className="relative flex flex-col gap-3 rounded-[25px] bg-bg2 p-4">
            <span className="flex flex-col gap-0.75">
              <span className="eyebrow">{t('dayGoal.reviewLabel')}</span>
              <span className="text-body font-semibold">{t('dayGoal.reviewPrompt')}</span>
            </span>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={() => reviewFor('D', now)}>
                {t('dayGoal.reviewDo')}
              </Button>
              <Button size="sm" variant="ghost" className="flex-1" onClick={() => void aiReview()}>
                {t('dayGoal.reviewAi')}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {review ? (
        <GlassSurface className="rounded-row">
          <Pressable
            onClick={() => reviewFor('D', now)}
            className="flex w-full items-center gap-2.5 rounded-row px-3.5 py-2.5 text-left"
          >
            <span
              aria-hidden="true"
              className="size-3 rounded-pill"
              style={{
                background: moodColors[review.mood - 1],
                boxShadow: `0 0 10px ${moodColors[review.mood - 1] ?? 'transparent'}`,
              }}
            />
            <span className="flex-1 text-chip font-semibold">
              {t('dayGoal.reviewDone')}
              {review.ai ? t('dayGoal.byAi') : ''} ·{' '}
              <span className="font-serif text-sub italic">{moods[review.mood - 1]}</span>
            </span>
            <span className="mono-num text-label text-ink3">{t('dayGoal.edit')}</span>
          </Pressable>
        </GlassSurface>
      ) : null}
    </div>
  );
}
