import { isoWeek, weekKey } from '@kairo/core';
import {
  Button,
  GlassSurface,
  Pressable,
  energyGradients,
  hoursLegendGradient,
  moodColors,
  recap,
  status,
  withAlpha,
} from '@kairo/ui';
import { useTranslation } from 'react-i18next';
import { useBilanActions } from '../../lib/bilans';
import { useAppData } from '../../lib/data';
import { useFormat } from '../../lib/format';
import { useUi } from '../../store';
import type { BilansData } from '../StatsScreen';

/** Vue « Semaine » (onglet par défaut) : évolution sur 8 semaines, bilans, régularité, énergie. */
export function WeekTab({ now, data }: { now: Date; data: BilansData }) {
  const { t } = useTranslation('app');
  const f = useFormat();
  const { categories } = useAppData();
  const { reviewFor, fillDemo } = useBilanActions();
  const setRecap = useUi((s) => s.setRecap);
  const moods = t('stats.moods', { returnObjects: true }) as string[];
  const moments = t('stats.moments', { returnObjects: true }) as string[];
  const currentReview = data.reviews[weekKey(now)];
  const m = data.momentum;

  // Graphique des semaines : barres empilées par activité, régularité, pastille d'objectif.
  const hmax = Math.max(1, ...data.weeks.map((w) => w.totalMin / 60));
  const top = Math.ceil(hmax * 1.15);
  const bars = data.weeks.map((w, i) => {
    const x = 47 + i * 34.5;
    let y0 = 146;
    const segs = categories.flatMap((c) => {
      const min = w.perCategory[c.id];
      if (!min) return [];
      const h = (min / 60 / top) * 110;
      y0 -= h;
      return [{ y: y0, h: Math.max(0, h - 1), c: c.color, id: c.id }];
    });
    const rateY = w.rate === null ? null : 36 + (1 - w.rate) * 110;
    return {
      w,
      x,
      segs,
      goalY: y0 - 10,
      rateY,
      label: t('stats.weekShort', { n: isoWeek(w.weekStart).week }),
    };
  });

  const ratePath = bars
    .filter((b) => b.rateY !== null)
    .map((b, i) => `${i ? ' L' : 'M'}${b.x.toFixed(1)} ${(b.rateY ?? 0).toFixed(1)}`)
    .join('');

  const rows = [...data.weeks]
    .reverse()
    .slice(0, 4)
    .filter((w) => w.totalMin || w.goalReached !== null || data.reviews[weekKey(w.weekStart)]);

  return (
    <div className="flex flex-col gap-3.5">
      <Button onClick={() => reviewFor('W', now)}>
        {currentReview ? t('stats.weekReviewSee') : t('stats.weekReviewDo')}
      </Button>

      <GlassSurface className="flex flex-col gap-2.5 rounded-wide p-4.5">
        <span className="eyebrow">{t('stats.evolution')}</span>
        <svg
          viewBox="0 0 310 176"
          className="w-full overflow-visible"
          role="img"
          aria-label={t('stats.weekChart')}
        >
          <line x1="30" x2="305" y1="146" y2="146" stroke="var(--k-line)" />
          {[
            { y: 36, l: `${top}h` },
            { y: 91, l: `${Math.round(top / 2)}h` },
          ].map((g) => (
            <g key={g.y}>
              <line
                x1="30"
                x2="305"
                y1={g.y}
                y2={g.y}
                stroke="var(--k-line)"
                strokeDasharray="2 4"
              />
              <text x="24" y={g.y + 3} textAnchor="end" className="mono-num fill-ink3 text-tiny">
                {g.l}
              </text>
            </g>
          ))}
          {bars.map((b) => (
            <g key={b.x} opacity={b.w.current ? 1 : 0.8}>
              {b.segs.map((s) => (
                <rect key={s.id} x={b.x - 11} y={s.y} width="22" height={s.h} fill={s.c} />
              ))}
              {b.w.goalReached !== null ? (
                <circle
                  cx={b.x}
                  cy={b.goalY}
                  r="5"
                  fill={b.w.goalReached ? status.success : 'var(--k-bg2)'}
                  stroke={b.w.goalReached ? status.success : status.danger}
                  strokeWidth="2"
                />
              ) : null}
              <text
                x={b.x}
                y="162"
                textAnchor="middle"
                className={`mono-num text-tiny ${b.w.current ? 'fill-ink' : 'fill-ink3'}`}
              >
                {b.label}
              </text>
            </g>
          ))}
          {ratePath ? (
            <path
              d={ratePath}
              fill="none"
              stroke="var(--k-ink)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.8"
            />
          ) : null}
          {bars.map((b) =>
            b.rateY !== null ? (
              <circle key={`r${b.x}`} cx={b.x} cy={b.rateY} r="3" fill="var(--k-ink)" />
            ) : null,
          )}
        </svg>
        <div className="flex flex-wrap gap-x-3.5 gap-y-2 text-label text-ink3">
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-2.5 rounded-xs"
              style={{ background: hoursLegendGradient }}
            />
            {t('stats.legendHours')}
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-0.5 w-3.5 bg-ink" />
            {t('stats.legendRate')}
          </span>
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-2.25 rounded-pill"
              style={{ background: status.success }}
            />
            {t('stats.legendGoal')}
          </span>
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-2.25 rounded-pill border-2"
              style={{ borderColor: status.danger }}
            />
            {t('stats.legendMissed')}
          </span>
        </div>
      </GlassSurface>

      {rows.length ? (
        <div className="flex flex-col gap-2">
          {rows.map((w) => {
            const review = data.reviews[weekKey(w.weekStart)];
            const date = `${w.weekStart.getDate()} ${f.month(w.weekStart.getMonth())}`;
            const tag =
              w.goalReached === null
                ? { l: t('stats.noGoal'), bg: 'var(--k-track)', fg: 'var(--k-ink3)' }
                : w.goalReached
                  ? { l: t('stats.goalOk'), bg: status.success, fg: status.successInk }
                  : {
                      l: t('stats.goalMiss'),
                      bg: withAlpha(status.danger, 0.16),
                      fg: status.danger,
                    };
            return (
              <GlassSurface key={w.weekStart.getTime()} className="rounded-tile">
                <Pressable
                  onClick={() => reviewFor('W', w.weekStart)}
                  className="flex w-full flex-col gap-1.5 rounded-tile p-3.5 text-left"
                >
                  <span className="flex items-baseline gap-2">
                    <span className="flex-1 text-body font-semibold">
                      {w.current
                        ? t('stats.thisWeekRow', { date })
                        : t('stats.weekRow', { n: isoWeek(w.weekStart).week, date })}
                    </span>
                    <span className="mono-num text-caption text-ink2">
                      {f.hours(w.totalMin)} ·{' '}
                      {w.rate === null ? '–' : `${Math.round(w.rate * 100)} %`}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 text-small text-ink2">
                    <span
                      className="rounded-block px-1.75 py-0.75 mono-num text-micro font-semibold"
                      style={{ background: tag.bg, color: tag.fg }}
                    >
                      {tag.l}
                    </span>
                    <span className="flex-1 truncate">
                      {review
                        ? `${review.ai ? t('stats.aiPrefix') : ''}${review.a || review.b || moods[review.mood - 1]}`
                        : t('stats.tapReview')}
                    </span>
                  </span>
                </Pressable>
              </GlassSurface>
            );
          })}
        </div>
      ) : null}

      {!data.hasHistory ? (
        <GlassSurface className="flex flex-col gap-3 rounded-panel p-5.5">
          <span className="text-title font-bold tracking-snug">
            {t('stats.emptyA')}{' '}
            <span className="font-serif text-serif font-normal italic text-acc-text">
              {t('stats.emptyB')}
            </span>
            .
          </span>
          <span className="text-body leading-normal text-ink2">{t('stats.emptyBody')}</span>
          <Button variant="ghost" onClick={() => void fillDemo()}>
            {t('stats.demo')}
          </Button>
        </GlassSurface>
      ) : (
        <>
          <Pressable
            onClick={() => setRecap(0)}
            className="relative flex min-h-37.5 flex-col justify-between overflow-hidden rounded-panel p-5.5 text-left"
            style={{ background: recap.aurora, color: recap.ink }}
          >
            <span
              aria-hidden="true"
              className="absolute -right-17.5 -top-17.5 size-55 animate-morph iridescent opacity-70 blur-[40px]"
            />
            <span className="relative mono-num text-micro tracking-[0.2em] opacity-80">
              {t('stats.recapEyebrow', { n: isoWeek(now).week })}
            </span>
            <span className="relative text-display font-bold leading-[1.05] tracking-[-0.04em]">
              {t('stats.recapA')}
              <br />
              <span
                className="font-serif text-big font-normal italic"
                style={{ color: recap.accent }}
              >
                {t('stats.recapB')}
              </span>
            </span>
            <span className="relative text-small font-semibold opacity-90">
              {t('stats.recapCta')}
            </span>
          </Pressable>

          <div className="grid grid-cols-2 gap-2.5">
            <GlassSurface className="flex flex-col gap-1 rounded-card p-4">
              <span className="eyebrow">{t('stats.momentum')}</span>
              <span className="num text-[2.875rem]">
                {m.current === null ? '–' : Math.round(m.current * 100)}
                <span className="text-title">%</span>
              </span>
              <span
                className="mono-num text-label font-semibold"
                style={{
                  color:
                    m.trend === null
                      ? 'var(--k-ink3)'
                      : m.trend >= 0
                        ? status.success
                        : status.danger,
                }}
              >
                {m.trend === null
                  ? t('stats.firstWeek')
                  : t('stats.trendPts', {
                      arrow: m.trend >= 0 ? '▲' : '▼',
                      n: m.trend >= 0 ? `+${m.trend}` : String(m.trend),
                    })}
              </span>
            </GlassSurface>
            <GlassSurface className="flex flex-col gap-1 rounded-card p-4">
              <span className="eyebrow">{t('stats.streak')}</span>
              <span className="num text-[2.875rem]" style={{ color: moodColors[2] }}>
                {data.series.current}
                <span className="text-title"> {t('stats.dayUnit')}</span>
              </span>
              <span className="mono-num text-label text-ink3">
                {t('stats.best')} {data.series.best} {t('stats.dayUnit')}
              </span>
            </GlassSurface>
          </div>

          <GlassSurface className="flex flex-col gap-2.5 rounded-card p-4">
            <span className="eyebrow">{t('stats.heat')}</span>
            <div
              className="grid grid-cols-7 gap-1.5 text-center mono-num text-tiny text-ink3"
              aria-hidden="true"
            >
              {Array.from({ length: 7 }, (_, i) => (
                <span key={i}>{f.dayLetter(i)}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {data.heat.map((c) => (
                <span
                  key={c.day}
                  title={c.ratio === null ? c.day : `${c.day} · ${Math.round(c.ratio * 100)}%`}
                  className="aspect-square rounded-[9px]"
                  style={{
                    background: c.future
                      ? 'transparent'
                      : c.ratio === null
                        ? 'var(--k-track)'
                        : `color-mix(in oklab, ${status.success} ${Math.round(18 + c.ratio * 82)}%, transparent)`,
                    border: c.today
                      ? '1.5px solid var(--k-ink)'
                      : c.future
                        ? '1px dashed var(--k-line)'
                        : '0',
                  }}
                />
              ))}
            </div>
          </GlassSurface>

          <GlassSurface className="flex flex-col gap-3 rounded-card p-4">
            <span className="eyebrow">{t('stats.energy')}</span>
            <div className="grid h-27.5 grid-cols-3 items-end gap-2.5">
              {(['morning', 'afternoon', 'evening'] as const).map((k, i) => {
                const v = data.moments[k];
                return (
                  <div key={k} className="flex h-full flex-col items-center justify-end gap-1.5">
                    <span className="num text-input">
                      {v ? (Math.round(v * 10) / 10).toLocaleString(f.locale) : '–'}
                    </span>
                    <span
                      className="w-full min-h-1 rounded-icon"
                      style={{ height: `${(v / 3) * 100}%`, background: energyGradients[i] }}
                    />
                    <span className="mono-num text-micro text-ink3">{moments[i]}</span>
                  </div>
                );
              })}
            </div>
          </GlassSurface>

          <GlassSurface className="flex flex-col gap-3.5 rounded-card p-4">
            <span className="eyebrow">{t('stats.byActivity')}</span>
            {data.acts.map((a) => {
              const c = categories.find((x) => x.id === a.categoryId);
              if (!c) return null;
              const scale = Math.max(a.goalMin, a.plannedMin, 1);
              return (
                <div key={c.id} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-chip">
                    <span className="flex items-center gap-2 font-semibold">
                      <span
                        aria-hidden="true"
                        className="size-2.5 rounded-pill"
                        style={{ background: c.color }}
                      />
                      {c.name}
                    </span>
                    <span className="mono-num text-caption text-ink2">
                      {a.goalMin
                        ? t('stats.goalH', { done: f.hours(a.doneMin), goal: c.weeklyGoalH })
                        : t('stats.planH', {
                            done: f.hours(a.doneMin),
                            plan: f.hours(a.plannedMin),
                          })}
                    </span>
                  </div>
                  <div className="relative h-2.5 overflow-hidden rounded-xs bg-track">
                    <span
                      className="absolute inset-y-0 left-0"
                      style={{
                        width: `${(a.plannedMin / scale) * 100}%`,
                        background: withAlpha(c.color, 0.28),
                      }}
                    />
                    <span
                      className="absolute inset-y-0 left-0 rounded-xs"
                      style={{
                        width: `${(a.doneMin / scale) * 100}%`,
                        background: c.color,
                        boxShadow: `0 0 10px ${c.color}`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </GlassSurface>

          <div className="relative rounded-card p-[1.5px]">
            <span
              aria-hidden="true"
              className="absolute inset-0 animate-spin-iri rounded-card iridescent opacity-60"
            />
            <p className="relative m-0 rounded-[25px] bg-bg2 p-4 text-body leading-normal">
              <span className="font-serif text-[1.1875rem] italic">{t('stats.analysis')} </span>
              <span className="text-ink2">{data.insight}</span>
            </p>
          </div>
        </>
      )}
    </div>
  );
}
