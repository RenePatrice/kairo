import { dateKey, dayGoalProgress, doneOn, isoWeekday } from '@kairo/core';
import { GlassSurface, Pressable, moodColors, status } from '@kairo/ui';
import { useTranslation } from 'react-i18next';
import { toDayGoal, useBilanActions } from '../../lib/bilans';
import { useAppData } from '../../lib/data';
import { useFormat } from '../../lib/format';
import type { BilansData } from '../StatsScreen';

const W = 310;
const moodColor = (mood: number): string =>
  moodColors[Math.min(4, Math.max(0, mood - 1))] ?? moodColors[2];

/** Vue « Jour » : 14 derniers jours (réalisation et humeur) et bilans des 7 derniers jours. */
export function DayTab({ data }: { data: BilansData }) {
  const { t } = useTranslation('app');
  const f = useFormat();
  const { blocks, checks } = useAppData();
  const { reviewFor } = useBilanActions();
  const moods = t('stats.moods', { returnObjects: true }) as string[];

  // Graphique : du plus ancien (il y a 13 jours) à aujourd'hui.
  const days = data.daily.slice(0, 14).reverse();
  const bars = days.map((d, idx) => {
    const r = d.stats.ratio;
    const cx = 34 + idx * 20.5;
    const h = Math.max(r === null ? 0 : 3, (r ?? 0) * 112);
    const review = data.reviews[`D${dateKey(d.date)}`];
    const dot = review
      ? { y: 12 + (1 - (review.mood - 1) / 4) * 112, c: moodColor(review.mood) }
      : null;
    return { cx, h, r, idx, dot, today: idx === 13, date: d.date };
  });
  // Courbe d'humeur : interrompue les jours sans bilan.
  const moodPath = bars
    .map((b, i) =>
      b.dot ? `${bars[i - 1]?.dot ? ' L' : 'M'}${b.cx.toFixed(1)} ${b.dot.y.toFixed(1)}` : '',
    )
    .join('');
  const rated = days.filter((d) => d.stats.ratio !== null);
  const avg = rated.length
    ? `${Math.round((rated.reduce((m, d) => m + (d.stats.ratio ?? 0), 0) / rated.length) * 100)} %`
    : '–';

  const rows = data.daily.slice(0, 7).flatMap((d, k) => {
    const key = `D${dateKey(d.date)}`;
    const review = data.reviews[key];
    const goal = data.goals[key];
    if (!d.stats.due && !review && !goal) return [];
    const progress = dayGoalProgress(toDayGoal(goal), doneOn(blocks, d.date, checks));
    const date = d.date.getDate();
    const title =
      k === 0
        ? t('stats.todayRow', { date })
        : k === 1
          ? t('stats.yesterdayRow', { date })
          : t('stats.dayRow', { day: f.dayName(isoWeekday(d.date)), date });
    return [{ key, d, review, progress, title }];
  });

  return (
    <div className="flex flex-col gap-3.5">
      <GlassSurface className="flex flex-col gap-2.5 rounded-wide p-4.5">
        <div className="flex items-baseline justify-between">
          <span className="eyebrow">{t('stats.last14')}</span>
          <span className="mono-num text-label text-ink3">
            {t('stats.avg')} {avg}
          </span>
        </div>
        <svg
          viewBox={`0 0 ${W} 150`}
          className="w-full overflow-visible"
          role="img"
          aria-label={t('stats.dayChart')}
        >
          <line x1="30" x2="305" y1="12" y2="12" stroke="var(--k-line)" strokeDasharray="2 4" />
          <line x1="30" x2="305" y1="68" y2="68" stroke="var(--k-line)" strokeDasharray="2 4" />
          <line x1="30" x2="305" y1="124" y2="124" stroke="var(--k-line)" />
          {[
            ['100', 15],
            ['50', 71],
            ['0', 127],
          ].map(([l, y]) => (
            <text key={l} x="24" y={y} textAnchor="end" className="mono-num fill-ink3 text-tiny">
              {l}
            </text>
          ))}
          {bars.map((b) => (
            <rect
              key={b.idx}
              x={b.cx - 6}
              y={124 - b.h}
              width="12"
              height={b.h}
              rx="4"
              fill={b.today ? 'var(--k-acc)' : 'color-mix(in oklab, var(--k-acc) 55%, transparent)'}
              opacity={b.r === null ? 0.25 : 1}
            />
          ))}
          {moodPath ? (
            <path
              d={moodPath}
              fill="none"
              stroke={moodColors[2]}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
          {bars.map((b) =>
            b.dot ? (
              <circle
                key={`m${b.idx}`}
                cx={b.cx}
                cy={b.dot.y}
                r="4"
                fill={b.dot.c}
                stroke="var(--k-bg2)"
                strokeWidth="1.5"
              />
            ) : null,
          )}
          {bars
            .filter((b) => b.idx % 2 === 1 || b.today)
            .map((b) => (
              <text
                key={`x${b.idx}`}
                x={b.cx}
                y="142"
                textAnchor="middle"
                className={`mono-num text-tiny ${b.today ? 'fill-ink' : 'fill-ink3'}`}
              >
                {b.today ? t('stats.today') : b.date.getDate()}
              </text>
            ))}
        </svg>
        <div className="flex gap-4 text-label text-ink3">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-xs bg-acc" />
            {t('stats.legendDone')}
          </span>
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-2.5 rounded-pill"
              style={{ background: moodColors[2] }}
            />
            {t('stats.legendMood')}
          </span>
        </div>
      </GlassSurface>

      <div className="flex flex-col gap-2">
        {rows.map(({ key, d, review, progress, title }) => {
          const pct = d.stats.ratio === null ? null : Math.round(d.stats.ratio * 100);
          const ok = progress !== null && progress >= 1;
          return (
            <GlassSurface key={key} className="rounded-tile">
              <Pressable
                onClick={() => reviewFor('D', d.date)}
                className="flex w-full flex-col gap-2 rounded-tile p-3.5 text-left"
              >
                <span className="flex items-center gap-2.5">
                  <span className="flex-1 text-body font-semibold">{title}</span>
                  {progress !== null ? (
                    <span
                      className="rounded-block px-1.75 py-0.75 mono-num text-micro font-semibold"
                      style={{
                        background: ok
                          ? status.success
                          : 'color-mix(in oklab, var(--color-danger) 16%, transparent)',
                        color: ok ? status.successInk : status.danger,
                      }}
                    >
                      {ok ? t('stats.goalOk') : t('stats.goalMiss')}
                    </span>
                  ) : null}
                  <span className="num text-input">{pct === null ? '–' : `${pct}%`}</span>
                </span>
                <span className="h-1.5 overflow-hidden rounded-xs bg-track">
                  <span
                    className="block h-full rounded-xs bg-acc"
                    style={{ width: `${pct ?? 0}%` }}
                  />
                </span>
                <span className="flex items-center gap-2 text-small text-ink2">
                  <span
                    aria-hidden="true"
                    className="size-2.25 flex-none rounded-pill"
                    style={{ background: review ? moodColor(review.mood) : 'var(--k-track)' }}
                  />
                  <span className="flex-1 truncate">
                    {review
                      ? `${review.ai ? t('stats.aiPrefix') : ''}${review.a || review.b || moods[review.mood - 1]}`
                      : t('stats.noReview')}
                  </span>
                  <span className="whitespace-nowrap text-caption font-semibold text-acc-text">
                    {review ? t('stats.view') : t('stats.doReview')}
                  </span>
                </span>
              </Pressable>
            </GlassSurface>
          );
        })}
      </div>
    </div>
  );
}
