import {
  firstCheckDay,
  isoWeekday,
  minuteOfDay,
  startOfWeek,
  weekGoalProgress,
  weekKey,
  type WeekGoalStatus,
} from '@kairo/core';
import { useGoals, useReviews } from '@kairo/db';
import { GlassSurface, Pressable, recap, status, withAlpha } from '@kairo/ui';
import { useTranslation } from 'react-i18next';
import { toWeekGoal, useBilanActions } from '../../lib/bilans';
import { useAppData } from '../../lib/data';
import { useFormat } from '../../lib/format';
import { goalText } from '../../lib/reviewText';

const CX = (i: number) => 30 + i * 45;
const CY = (v: number, max: number) => 12 + (1 - v / max) * 112;

const STATUS_STYLE: Record<WeekGoalStatus, { bg: string; fg: string }> = {
  above: { bg: status.success, fg: status.successInk },
  reached: { bg: status.success, fg: status.successInk },
  ahead: { bg: status.success, fg: status.successInk },
  on_track: { bg: 'var(--k-acc)', fg: 'var(--k-acc-ink)' },
  below: { bg: withAlpha(status.danger, 0.18), fg: status.danger },
  behind: { bg: withAlpha(status.danger, 0.18), fg: status.danger },
};

/** Fin de semaine : invitation au bilan, puis le cap de la semaine et sa courbe (écran Semaine). */
export function WeekGoal({ now }: { now: Date }) {
  const { t } = useTranslation('app');
  const f = useFormat();
  const { blocks, checks, restDays, categoryOf } = useAppData();
  const goals = useGoals();
  const reviews = useReviews();
  const { goalFor, reviewFor } = useBilanActions();
  if (!goals || !reviews || !blocks.length) return null;

  const key = weekKey(now);
  const goal = toWeekGoal(goals[key]);
  const today = isoWeekday(now);
  const showReview = !reviews[key] && (today === 6 || (today === 5 && minuteOfDay(now) >= 1080));

  return (
    <div className="flex flex-col gap-3.5">
      {showReview ? (
        <Pressable
          onClick={() => reviewFor('W', now)}
          className="relative flex flex-col gap-1.5 overflow-hidden rounded-wide p-4.5 text-left"
          style={{ background: recap.aurora, color: recap.ink }}
        >
          <span
            aria-hidden="true"
            className="absolute -right-15 -top-15 size-45 animate-spin-iri iridescent opacity-60 blur-[40px]"
          />
          <span className="relative mono-num text-micro tracking-[0.2em] opacity-80">
            {t('weekGoal.reviewEyebrow')}
          </span>
          <span className="relative text-heading font-bold tracking-[-0.03em]">
            {t('weekGoal.reviewA')}{' '}
            <span
              className="font-serif text-[1.4375rem] font-normal italic"
              style={{ color: recap.accent }}
            >
              {t('weekGoal.reviewB')}
            </span>
          </span>
        </Pressable>
      ) : null}

      {goal ? (
        <GoalCard
          now={now}
          goal={goal}
          text={goalText(
            { ...goal, text: goal.text ?? '', categoryId: goal.categoryId ?? null },
            t,
            (id) => categoryOf(id).name,
            'W',
          )}
          onEdit={() => goalFor('W', now)}
          progress={weekGoalProgress(goal, blocks, startOfWeek(now), now, {
            checks,
            restDays,
            since: firstCheckDay(checks),
          })}
          f={f}
        />
      ) : (
        <Pressable
          onClick={() => goalFor('W', now)}
          className="flex flex-col gap-1.5 rounded-wide border-[1.5px] border-dashed border-line p-4.5 text-left"
        >
          <span className="eyebrow">{t('weekGoal.label')}</span>
          <span className="text-heading font-bold tracking-[-0.03em]">
            {t('weekGoal.emptyA')}{' '}
            <span className="font-serif text-[1.4375rem] font-normal italic text-acc-text">
              {t('weekGoal.emptyB')}
            </span>{' '}
            {t('weekGoal.emptyC')}
          </span>
          <span className="text-small text-ink2">{t('weekGoal.emptyBody')}</span>
        </Pressable>
      )}
    </div>
  );
}

function GoalCard({
  now,
  goal,
  text,
  progress,
  onEdit,
  f,
}: {
  now: Date;
  goal: NonNullable<ReturnType<typeof toWeekGoal>>;
  text: string;
  progress: ReturnType<typeof weekGoalProgress>;
  onEdit: () => void;
  f: ReturnType<typeof useFormat>;
}) {
  const { t } = useTranslation('app');
  const { categoryOf } = useAppData();
  const today = isoWeekday(now);
  const rate = goal.kind === 'rate';
  const max = rate ? 100 : Math.max(goal.target, progress.value, 1) * 1.12;
  const pts = progress.points.map((p, i) => ({
    x: CX(p.day),
    y: CY(p.value, max),
    last: i === progress.points.length - 1,
  }));
  const line = pts.map((p, i) => `${i ? ' L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('');
  const first = pts[0];
  const last = pts[pts.length - 1];
  const area = first && last ? `${line} L${last.x} 124 L${first.x} 124 Z` : '';
  const ideal = rate
    ? `M30 ${CY(goal.target, 100).toFixed(1)} L300 ${CY(goal.target, 100).toFixed(1)}`
    : `M30 ${CY(goal.target / 7, max).toFixed(1)} L300 ${CY(goal.target, max).toFixed(1)}`;
  const grid = (rate ? [0, 50, 100] : [0, max / 2, max]).map((v) => ({
    y: CY(v, max),
    l: rate ? `${v}%` : `${Math.round(v)}h`,
  }));
  const style = STATUS_STYLE[progress.status];

  return (
    <GlassSurface className="flex flex-col gap-3 rounded-panel p-4.5">
      <div className="flex items-center justify-between">
        <span className="eyebrow">{t('weekGoal.label')}</span>
        <button
          type="button"
          onClick={onEdit}
          className="min-h-11 text-caption font-semibold text-acc-text"
        >
          {t('weekGoal.edit')}
        </button>
      </div>
      <span className="font-serif text-serif leading-tight italic">{text}</span>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="num text-numeral">
          {rate ? `${Math.round(progress.value)} %` : f.hours(progress.value * 60)}
        </span>
        <span className="mono-num text-small text-ink3">
          {rate
            ? t('weekGoal.targetRate', { n: goal.target })
            : goal.kind === 'act' && goal.categoryId
              ? t('weekGoal.targetAct', { n: goal.target, name: categoryOf(goal.categoryId).name })
              : t('weekGoal.targetHours', { n: goal.target })}
        </span>
        <span
          className="ml-auto rounded-icon px-2.25 py-1.25 mono-num text-micro font-semibold tracking-[0.08em]"
          style={{ background: style.bg, color: style.fg }}
        >
          {t(`weekGoal.status.${progress.status}`)}
        </span>
      </div>
      <svg
        viewBox="0 0 310 150"
        className="w-full overflow-visible"
        role="img"
        aria-label={t('weekGoal.chart')}
      >
        <defs>
          <linearGradient id="k-week-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--k-acc)" stopOpacity="0.45" />
            <stop offset="1" stopColor="var(--k-acc)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {grid.map((g) => (
          <g key={g.l}>
            <line x1="30" x2="305" y1={g.y} y2={g.y} stroke="var(--k-line)" strokeDasharray="2 4" />
            <text x="24" y={g.y + 3} textAnchor="end" className="mono-num fill-ink3 text-tiny">
              {g.l}
            </text>
          </g>
        ))}
        <line
          x1={CX(today)}
          x2={CX(today)}
          y1="10"
          y2="124"
          stroke="var(--k-ink3)"
          strokeDasharray="3 3"
          opacity="0.6"
        />
        <path
          d={ideal}
          fill="none"
          stroke="var(--k-ink3)"
          strokeWidth="1.5"
          strokeDasharray="5 5"
        />
        {area ? <path d={area} fill="url(#k-week-area)" /> : null}
        {line ? (
          <path
            d={line}
            fill="none"
            stroke="var(--k-acc)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: 'drop-shadow(0 0 6px var(--k-acc))' }}
          />
        ) : null}
        {pts.map((p) => (
          <circle
            key={p.x}
            cx={p.x}
            cy={p.y}
            r={p.last ? 5 : 3}
            fill="var(--k-bg2)"
            stroke="var(--k-acc)"
            strokeWidth="2.5"
          />
        ))}
        {Array.from({ length: 7 }, (_, i) => (
          <text
            key={i}
            x={CX(i)}
            y="142"
            textAnchor="middle"
            className={`text-micro ${i === today ? 'fill-ink font-bold' : 'fill-ink3'}`}
          >
            {f.dayLetter(i)}
          </text>
        ))}
      </svg>
      <div className="flex gap-4 text-label text-ink3">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-0.75 w-3.5 rounded-xs bg-acc" />
          {t('weekGoal.legendDone')}
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="w-3.5 border-t-2 border-dashed border-ink3" />
          {rate ? t('weekGoal.legendTarget', { n: goal.target }) : t('weekGoal.legendIdeal')}
        </span>
      </div>
    </GlassSurface>
  );
}
