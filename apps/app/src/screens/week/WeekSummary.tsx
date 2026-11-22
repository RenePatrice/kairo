import { overviewSegments, weekDates, weekLoads, weekMix, weekWindow } from '@kairo/core';
import type { Block } from '@kairo/db';
import { GlassSurface, Pressable, withAlpha } from '@kairo/ui';
import { useTranslation } from 'react-i18next';
import { useAppData } from '../../lib/data';
import { useFormat } from '../../lib/format';
import { useUi } from '../../store';

/** « Vue d'ensemble » (barre horaire par jour) et « Répartition de la semaine ». */
export function WeekSummary({ weekStart, today }: { weekStart: Date; today: number }) {
  const { t } = useTranslation('app');
  const f = useFormat();
  const { blocks, categoryOf, settings } = useAppData();
  const weekDay = useUi((s) => s.weekDay);
  const setWeekDay = useUi((s) => s.setWeekDay);
  const rhythm = { wakeMin: settings.profile.wakeMin, sleepMin: settings.profile.sleepMin };
  const win = weekWindow(blocks, rhythm);
  const loads = weekLoads(blocks, weekStart);
  const total = loads.reduce((a, b) => a + b, 0);
  const mix = weekMix<Block, string>(blocks, weekStart, (b) => b.categoryId);

  return (
    <>
      <GlassSurface className="flex flex-col gap-3 rounded-wide p-4.5">
        <div className="flex items-baseline justify-between">
          <span className="label-mono">{t('week.overview')}</span>
          <span className="mono-num text-label text-ink3">
            {t('week.planned', { hours: f.hours(total) })}
          </span>
        </div>
        {weekDates(weekStart).map((d, i) => {
          const sel = weekDay === i;
          return (
            <Pressable
              key={i}
              aria-label={t('week.show', { day: f.dayName(i) })}
              aria-pressed={sel}
              onClick={() => setWeekDay(i)}
              className="flex min-h-8 items-center gap-2.5"
              style={{ opacity: sel ? 1 : 0.85 }}
            >
              <span
                className={`w-7.5 text-left text-caption font-bold ${
                  sel ? 'text-ink' : i === today ? 'text-acc-text' : 'text-ink3'
                }`}
              >
                {f.dayLetter(i)} {d.getDate()}
              </span>
              <span
                className={`relative flex-1 overflow-hidden rounded-block bg-track transition-[height] duration-300 ${
                  sel ? 'h-4 shadow-[0_0_0_1px_var(--k-ink3)]' : 'h-2.5'
                }`}
              >
                {overviewSegments(blocks, d, win, rhythm).map((s) => (
                  <span
                    key={s.slot.id}
                    className="absolute inset-y-0 border-r border-bg"
                    style={{
                      left: `${s.left}%`,
                      width: `${s.width}%`,
                      background: categoryOf(s.slot.categoryId).color,
                    }}
                  />
                ))}
              </span>
              <span className="w-9.5 text-right mono-num text-micro text-ink3">
                {f.hours(loads[i] ?? 0)}
              </span>
            </Pressable>
          );
        })}
        <div
          aria-hidden="true"
          className="flex justify-between pl-10 pr-12 mono-num text-tiny text-ink3"
        >
          <span>{f.clock(win.start)}</span>
          <span>{f.clock(win.start + win.span / 2)}</span>
          <span>{f.clock(win.end)}</span>
        </div>
      </GlassSurface>

      {mix.length ? (
        <GlassSurface className="flex flex-col gap-3.5 rounded-wide p-4.5">
          <span className="label-mono">{t('week.mix')}</span>
          <div aria-hidden="true" className="flex h-4 gap-0.5 overflow-hidden rounded-block">
            {mix.map((m) => {
              const c = categoryOf(m.key);
              return (
                <span
                  key={m.key}
                  style={{
                    width: `${m.share * 100}%`,
                    background: c.color,
                    boxShadow: `0 0 12px ${withAlpha(c.color, 0.35)}`,
                  }}
                />
              );
            })}
          </div>
          <ul className="m-0 grid list-none grid-cols-2 gap-x-3 gap-y-2.5 p-0">
            {mix.map((m) => {
              const c = categoryOf(m.key);
              return (
                <li key={m.key} className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="size-2.5 flex-none rounded-xs"
                    style={{ background: c.color }}
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-small font-semibold">{c.name}</span>
                    <span className="mono-num text-micro text-ink3">
                      {c.weeklyGoalH
                        ? t('week.mixGoal', { hours: f.hours(m.minutes), goal: c.weeklyGoalH })
                        : t('week.mixShare', {
                            hours: f.hours(m.minutes),
                            pct: Math.round(m.share * 100),
                          })}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </GlassSurface>
      ) : null}
    </>
  );
}
