import {
  addDays,
  isoWeek,
  isoWeekday,
  occurrencesOn,
  recurringOn,
  startOfWeek,
  weekLoads,
} from '@kairo/core';
import { breakpoints, Button, GlassSurface, Icon, Pressable, useMediaQuery } from '@kairo/ui';
import { motion, type PanInfo } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useAppData } from '../lib/data';
import { useFormat } from '../lib/format';
import { useSheetActions } from '../lib/actions';
import { useNow } from '../lib/useNow';
import { useUi } from '../store';
import { Agenda } from './week/Agenda';
import { WeekGoal } from './week/WeekGoal';
import { WeekSummary } from './week/WeekSummary';
import { WideWeek } from './week/WideWeek';

const RING = 2 * Math.PI * 14;
const SWIPE_PX = 60;

/** Écran Semaine de la maquette : pastilles des 7 jours, agenda du jour, vue d'ensemble. */
export function WeekScreen() {
  const { t } = useTranslation('app');
  const f = useFormat();
  const now = useNow(30_000);
  const { blocks } = useAppData();
  const { newBlock } = useSheetActions();
  const weekDay = useUi((s) => s.weekDay);
  const setWeekDay = useUi((s) => s.setWeekDay);
  const openDup = useUi((s) => s.openDup);
  const wide = useMediaQuery(`(min-width: ${breakpoints.tablet}px)`);

  const weekStart = startOfWeek(now, 1);
  const weekEnd = addDays(weekStart, 6);
  const today = isoWeekday(now);
  const loads = weekLoads(blocks, weekStart);
  const maxLoad = Math.max(1, ...loads);
  const sel = addDays(weekStart, weekDay);
  const dayCount = occurrencesOn(blocks, sel).length;
  const prev = () => setWeekDay((weekDay + 6) % 7);
  const next = () => setWeekDay((weekDay + 1) % 7);

  const onSwipe = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -SWIPE_PX) next();
    else if (info.offset.x > SWIPE_PX) prev();
  };

  const dayView = (
    <>
      <div className="grid grid-cols-7 gap-1.5">
        {loads.map((load, i) => {
          const on = weekDay === i;
          return (
            <Pressable
              key={i}
              haptic
              aria-pressed={on}
              onClick={() => setWeekDay(i)}
              className={`flex h-21 flex-col items-center justify-center gap-1.25 rounded-tile border ${
                on
                  ? 'border-transparent bg-inv text-inv-ink shadow-[0_12px_30px_rgba(0,0,0,0.25)]'
                  : 'border-line bg-card text-ink'
              }`}
            >
              <span aria-hidden="true" className="text-label font-semibold opacity-80">
                {f.dayLetter(i)}
              </span>
              <span className="sr-only">{f.dayName(i)}</span>
              <span className="relative flex size-8.5 items-center justify-center">
                <svg
                  width="34"
                  height="34"
                  viewBox="0 0 34 34"
                  aria-hidden="true"
                  className="absolute inset-0"
                >
                  <circle
                    cx="17"
                    cy="17"
                    r="14"
                    fill="none"
                    stroke={
                      on
                        ? 'color-mix(in oklab, var(--k-inv-ink) 25%, transparent)'
                        : 'var(--k-track)'
                    }
                    strokeWidth="3"
                  />
                  <circle
                    cx="17"
                    cy="17"
                    r="14"
                    fill="none"
                    stroke={on ? 'var(--k-acc)' : 'var(--k-ink3)'}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${(RING * load) / maxLoad} ${RING}`}
                    transform="rotate(-90 17 17)"
                  />
                </svg>
                <span className="num text-chip">{addDays(weekStart, i).getDate()}</span>
              </span>
              <span className="sr-only">, {t('week.planned', { hours: f.hours(load) })}</span>
              <span
                aria-hidden="true"
                className="size-1.25 rounded-pill"
                style={{ background: i === today ? 'var(--k-acc)' : 'transparent' }}
              />
            </Pressable>
          );
        })}
      </div>

      <div className="flex items-center gap-2.5">
        <GlassSurface className="rounded-pill">
          <Pressable
            aria-label={t('week.prevDay')}
            onClick={prev}
            className="flex size-11 items-center justify-center rounded-pill"
          >
            <Icon name="chevronLeft" size={18} />
          </Pressable>
        </GlassSurface>
        <div className="flex flex-1 flex-col items-center gap-0.5 text-center" aria-live="polite">
          <span className="text-day font-bold tracking-[-0.04em]">
            {f.dayName(weekDay)}{' '}
            <span className="font-serif text-display font-normal italic text-acc-text">
              {sel.getDate()}
            </span>
          </span>
          <span className="mono-num text-label text-ink3">
            {dayCount
              ? t('week.slots', { count: dayCount, hours: f.hours(loads[weekDay] ?? 0) })
              : t('week.noSlot')}
          </span>
        </div>
        <GlassSurface className="rounded-pill">
          <Pressable
            aria-label={t('week.nextDay')}
            onClick={next}
            className="flex size-11 items-center justify-center rounded-pill"
          >
            <Icon name="chevronRight" size={18} />
          </Pressable>
        </GlassSurface>
      </div>

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.18}
        dragSnapToOrigin
        onDragEnd={onSwipe}
      >
        {dayCount ? (
          <Agenda date={sel} weekday={weekDay} now={now} />
        ) : (
          <GlassSurface className="flex flex-col items-center gap-3 rounded-panel px-5.5 py-6.5 text-center">
            <div aria-hidden="true" className="size-14 animate-morph iridescent opacity-85" />
            <span className="text-title font-bold tracking-snug">
              {t('week.freeA')}{' '}
              <span className="font-serif text-serif font-normal italic text-acc-text">
                {t('week.freeB')}
              </span>
              .
            </span>
            <span className="max-w-65 text-chip leading-normal text-ink2">
              {t('week.freeBody')}
            </span>
            <Button className="mt-1 h-12 px-5.5" onClick={() => newBlock(weekDay)}>
              {t('week.addSlot')}
            </Button>
          </GlassSurface>
        )}
      </motion.div>
    </>
  );

  return (
    <div className="flex flex-col gap-4.5">
      <span className="eyebrow">
        {t('week.range', {
          n: isoWeek(now).week,
          from: weekStart.getDate(),
          to: weekEnd.getDate(),
          month: f.month(weekEnd.getMonth()),
        })}
      </span>
      <div className="flex items-end justify-between">
        <h1 className="headline text-hero">
          {t('week.titleA')} <em>{t('week.titleB')}</em>.
        </h1>
        <Button size="sm" className="text-chip" onClick={() => newBlock(weekDay)}>
          {t('today.addShort')}
        </Button>
      </div>

      <WeekGoal now={now} />

      {wide ? (
        <div className="flex flex-col gap-4">
          <WideWeek weekStart={weekStart} now={now} />
          {blocks.length ? (
            <div className="grid gap-3.5 desktop:grid-cols-2">
              <WeekSummary weekStart={weekStart} today={today} />
            </div>
          ) : null}
        </div>
      ) : (
        <>
          {dayView}
          {blocks.length ? (
            <div className="flex flex-col gap-3.5">
              <WeekSummary weekStart={weekStart} today={today} />
              {recurringOn(blocks, weekDay) > 0 ? (
                <Button variant="ghost" className="h-12 text-chip" onClick={openDup}>
                  {t('week.copy', { day: f.dayInSentence(weekDay) })}
                </Button>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
