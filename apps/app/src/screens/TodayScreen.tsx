import {
  checkKey,
  dateKey,
  firstCheckDay,
  greetingFor,
  isoWeekday,
  minuteOfDay,
  minutesUntilStart,
  nowAndNext,
  occurrencesOn,
  pendingCheckIns,
  remainingMs,
  rowState,
  splitDuration,
  startOfWeek,
  streak,
  weekDoneMinutes,
  weekMinutesFor,
  type Occurrence,
} from '@kairo/core';
import { toggleRestDay, useDb, type Block } from '@kairo/db';
import { Button, GlassSurface, Icon, inkFor, Pressable, status, withAlpha } from '@kairo/ui';
import { useTranslation } from 'react-i18next';
import { useCheckIns } from '../lib/checkins';
import { useAppData } from '../lib/data';
import { useFormat } from '../lib/format';
import { useSheetActions } from '../lib/actions';
import { useNow } from '../lib/useNow';
import { useUi } from '../store';
import { Dial } from './today/Dial';

const GOAL_RING = 2 * Math.PI * 26;

/** Écran Aujourd'hui de la maquette : il se recompose selon l'heure et le créneau en cours. */
export function TodayScreen() {
  const { t } = useTranslation('app');
  const db = useDb();
  const f = useFormat();
  const now = useNow(1000);
  const { settings, categories, blocks, checks, restDays, steps, categoryOf } = useAppData();
  const { newBlock, editBlock } = useSheetActions();
  const { markDone, markMissed, undo, focus } = useCheckIns();
  const flash = useUi((s) => s.flash);
  const setAssistant = useUi((s) => s.setAssistant);

  const p = settings.profile;
  const rhythm = { wakeMin: p.wakeMin, sleepMin: p.sleepMin };
  const today = dateKey(now);
  const nowMin = minuteOfDay(now);
  const isRest = restDays.has(today);
  const todayOcc = occurrencesOn(blocks, now);
  const { current, next } = nowAndNext(blocks, now);
  // Le cadran et la liste montrent les créneaux qui commencent aujourd'hui.
  const cur = current && current.day === today ? current : null;
  const nextToday = next && next.day === today ? next : null;
  const colorOf = (b: Block) => categoryOf(b.categoryId).color;
  const series = streak(blocks, now, { checks, restDays, since: firstCheckDay(checks) });
  const pending = pendingCheckIns(todayOcc, checks, now);
  const weekStart = startOfWeek(now, 1);

  const toggleRest = async () => {
    const on = await toggleRestDay(db, today);
    flash(on ? t('today.restToastOn') : t('today.restToastOff'));
  };

  const center = (() => {
    if (cur) {
      const c = categoryOf(cur.slot.categoryId);
      const { h, m, s } = splitDuration(remainingMs(cur, now));
      return {
        tag: c.name.toUpperCase(),
        color: c.color,
        halo: withAlpha(c.color, 0.18),
        big: `${h}:${String(m).padStart(2, '0')}`,
        size: 'text-countdown',
        sub: t('today.secondsEnd', {
          s: String(s).padStart(2, '0'),
          end: f.clock(cur.slot.endMin),
        }),
        aria: t('today.open', { name: c.name }),
        onClick: () => focus(cur),
      };
    }
    if (nextToday) {
      const c = categoryOf(nextToday.slot.categoryId);
      const wait = minutesUntilStart(nextToday, now);
      return {
        tag: t('today.tagNext'),
        color: c.color,
        halo: withAlpha(c.color, 0.12),
        big: f.duration(wait),
        size: wait >= 60 ? 'text-big' : 'text-numeral',
        sub: t('today.nextAt', { name: c.name, time: f.clock(nextToday.slot.startMin) }),
        aria: t('today.open', { name: c.name }),
        onClick: () => editBlock(nextToday.slot),
      };
    }
    return {
      tag: t('today.tagFree'),
      color: 'var(--k-ink3)',
      halo: 'transparent',
      big: f.clock(nowMin),
      size: 'text-splash',
      sub: todayOcc.length ? t('today.dayDone') : t('today.nothing'),
      aria: t('today.addSlot'),
      onClick: () => newBlock(),
    };
  })();

  const goals = categories
    .map((c) => {
      const planMin = weekMinutesFor(blocks, weekStart, (b) => b.categoryId === c.id);
      const doneMin = weekDoneMinutes(blocks, weekStart, checks, (b) => b.categoryId === c.id);
      const goalMin = c.weeklyGoalH * 60;
      const ratio = goalMin ? doneMin / goalMin : planMin ? doneMin / planMin : 0;
      return { c, planMin, doneMin, ratio };
    })
    .filter((g) => g.c.weeklyGoalH || g.planMin);

  const rowLabel = (o: Occurrence<Block>) => {
    const st = rowState(o, checks, now);
    return st === 'upcoming'
      ? t('today.status.upcoming', { time: f.clock(o.slot.startMin) })
      : t(`today.status.${st}`);
  };

  const rowAction = (o: Occurrence<Block>) => {
    const st = rowState(o, checks, now);
    if (st === 'current') return focus(o);
    if (st === 'done' || st === 'missed') return void undo(o);
    if (st === 'due') return void markDone(o);
    editBlock(o.slot);
  };

  return (
    <div className="flex flex-col gap-5 desktop:grid desktop:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] desktop:items-start desktop:gap-x-10">
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <span className="eyebrow">
            {t('today.date', {
              day: f.dayName(isoWeekday(now)),
              date: now.getDate(),
              month: f.month(now.getMonth()),
              time: f.clock(nowMin),
            })}
          </span>
          <span className="flex gap-1.5">
            {series.current > 0 ? (
              <GlassSurface
                as="span"
                className="rounded-chip px-2.5 py-1.25 mono-num text-label font-semibold"
                style={{ color: status.streak }}
              >
                {t('today.streak', { n: series.current })}
              </GlassSurface>
            ) : null}
            <Pressable
              haptic
              aria-pressed={isRest}
              onClick={() => void toggleRest()}
              className={`min-h-7 rounded-chip border border-line px-2.5 py-1.25 mono-num text-label font-semibold ${
                isRest ? '' : 'bg-card text-ink2'
              }`}
              style={isRest ? { background: status.rest, color: status.successInk } : undefined}
            >
              {isRest ? t('today.restOn') : t('today.rest')}
            </Pressable>
          </span>
        </div>

        <h1 className="headline text-hero">
          {t(`today.greet.${greetingFor(nowMin)}`)}
          <br />
          <em>{p.name || t('today.you')}.</em>
        </h1>

        {isRest ? (
          <GlassSurface
            className="flex items-center gap-3 rounded-slot p-4"
            style={{ borderColor: withAlpha(status.rest, 0.5) }}
          >
            <Icon name="leaf" size={28} color={status.rest} />
            <span className="flex-1 text-chip leading-snug text-ink2">
              <span className="font-bold text-ink">{t('today.restTitle')}</span>{' '}
              {t('today.restBody')}
            </span>
          </GlassSurface>
        ) : null}

        {!blocks.length ? (
          <GlassSurface className="flex flex-col gap-3.5 rounded-panel p-5.5">
            <span className="text-title font-bold tracking-snug">
              {t('today.emptyA')}{' '}
              <span className="font-serif text-serif font-normal italic text-acc-text">
                {t('today.emptyB')}
              </span>
              .
            </span>
            <span className="text-body leading-normal text-ink2">{t('today.emptyBody')}</span>
            <div className="flex gap-2">
              <Button className="h-12 flex-1" onClick={() => newBlock()}>
                {t('common.add')}
              </Button>
              <Button variant="ghost" className="h-12 flex-1" onClick={() => setAssistant(true)}>
                {t('today.askAi')}
              </Button>
            </div>
          </GlassSurface>
        ) : (
          <>
            <Dial
              occurrences={todayOcc}
              current={cur}
              checks={checks}
              rhythm={rhythm}
              now={now}
              colorOf={colorOf}
            >
              <button
                type="button"
                onClick={center.onClick}
                aria-label={center.aria}
                className="absolute inset-0 m-auto flex size-42.5 flex-col items-center justify-center gap-1 rounded-pill text-center"
                style={{ background: `radial-gradient(circle, ${center.halo}, transparent 70%)` }}
              >
                <span
                  className="flex items-center gap-1.5 mono-num text-micro font-semibold tracking-[0.16em]"
                  style={{ color: center.color }}
                >
                  <span
                    aria-hidden="true"
                    className="size-1.5 animate-pulse-soft rounded-pill"
                    style={{ background: center.color }}
                  />
                  {center.tag}
                </span>
                <span className={`num leading-none ${center.size}`}>{center.big}</span>
                <span className="max-w-37.5 font-serif text-input italic text-ink2">
                  {center.sub}
                </span>
              </button>
            </Dial>

            {cur ? (
              <Button
                className="h-12.5 self-center px-6.5"
                onClick={() => focus(cur)}
                style={{
                  background: colorOf(cur.slot),
                  color: inkFor(colorOf(cur.slot)),
                  boxShadow: `0 12px 40px ${withAlpha(colorOf(cur.slot), 0.4)}`,
                }}
              >
                <Icon name="play" size={16} filled />
                {t('today.focus')}
              </Button>
            ) : null}
          </>
        )}
      </div>

      {blocks.length ? (
        <div className="flex flex-col gap-5">
          {pending.length ? (
            <div className="relative rounded-wide p-[1.5px]">
              <span
                aria-hidden="true"
                className="absolute inset-0 animate-spin-iri rounded-wide iridescent opacity-75"
              />
              <GlassSurface
                level="thick"
                className="relative flex flex-col gap-3 rounded-[calc(var(--radius-wide)-1.5px)] p-4"
              >
                <span className="text-body">
                  <span className="font-bold">{t('today.checkTitle')}</span>{' '}
                  <span className="text-ink2">{t('today.checkBody')}</span>
                </span>
                {pending.map((o) => {
                  const c = categoryOf(o.slot.categoryId);
                  return (
                    <div key={o.slot.id} className="flex items-center gap-2.5">
                      <span
                        aria-hidden="true"
                        className="size-2.5 flex-none rounded-pill"
                        style={{ background: c.color, boxShadow: `0 0 8px ${c.color}` }}
                      />
                      <span className="flex flex-1 flex-col">
                        <span className="text-body font-semibold">{c.name}</span>
                        <span className="mono-num text-label text-ink3">
                          {f.clock(o.slot.startMin)}–{f.clock(o.slot.endMin)}
                        </span>
                      </span>
                      <Pressable
                        haptic
                        onClick={() => void markDone(o)}
                        className="h-11 rounded-pill px-3.5 text-small font-bold"
                        style={{ background: status.success, color: status.successInk }}
                      >
                        {t('today.done')}
                      </Pressable>
                      <Pressable
                        haptic
                        onClick={() => void markMissed(o)}
                        className="h-11 rounded-pill border border-line bg-card px-3 text-small font-semibold"
                      >
                        {t('today.missed')}
                      </Pressable>
                    </div>
                  );
                })}
              </GlassSurface>
            </div>
          ) : null}

          {goals.length ? (
            <section className="flex flex-col gap-2.5">
              <span className="label-mono">{t('today.goals')}</span>
              <div className="no-scrollbar -mx-5 flex gap-2.5 overflow-x-auto px-5">
                {goals.map(({ c, planMin, doneMin, ratio }) => (
                  <GlassSurface
                    key={c.id}
                    className="flex w-28 flex-none flex-col items-center gap-2 rounded-slot px-2.5 py-3.5"
                  >
                    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
                      <circle
                        cx="32"
                        cy="32"
                        r="26"
                        fill="none"
                        stroke="var(--k-track)"
                        strokeWidth="7"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r="26"
                        fill="none"
                        stroke={c.color}
                        strokeWidth="7"
                        strokeLinecap="round"
                        strokeDasharray={`${(GOAL_RING * Math.min(1, ratio)).toFixed(1)} ${GOAL_RING.toFixed(1)}`}
                        transform="rotate(-90 32 32)"
                        style={{ filter: `drop-shadow(0 0 5px ${c.color})` }}
                      />
                      <text
                        x="32"
                        y="36"
                        textAnchor="middle"
                        fontSize="13"
                        fontWeight="700"
                        fill="var(--k-ink)"
                      >
                        {Math.round(ratio * 100)}%
                      </text>
                    </svg>
                    <span className="max-w-23 truncate text-center text-small font-semibold">
                      {c.name}
                    </span>
                    <span className="mono-num text-micro text-ink3">
                      {t('today.goalTxt', {
                        done: f.hours(doneMin),
                        goal: c.weeklyGoalH
                          ? t('common.hoursShort', { h: c.weeklyGoalH })
                          : f.hours(planMin),
                      })}
                    </span>
                  </GlassSurface>
                ))}
              </div>
            </section>
          ) : null}

          <div className="flex items-center justify-between">
            <h2 className="m-0 text-heading font-bold tracking-snug">{t('today.list')}</h2>
            <button
              type="button"
              onClick={() => newBlock()}
              className="min-h-11 text-chip font-semibold text-acc-text"
            >
              {t('today.addShort')}
            </button>
          </div>

          {!todayOcc.length ? (
            <GlassSurface className="rounded-slot p-4.5 text-body text-ink2">
              {t('today.noTodayA')}{' '}
              <span className="font-serif text-lead italic text-ink">{t('today.noTodayB')}</span>
            </GlassSurface>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {todayOcc.map((o) => {
                const c = categoryOf(o.slot.categoryId);
                const st = rowState(o, checks, now);
                const done = steps[checkKey(o.day, o.slot.id)]?.length ?? 0;
                const total = o.slot.steps.length;
                const chip =
                  st === 'done'
                    ? { background: status.success, color: status.successInk }
                    : st === 'missed'
                      ? { background: withAlpha(status.danger, 0.16) }
                      : st === 'current'
                        ? { background: c.color, color: inkFor(c.color) }
                        : { background: 'var(--k-track)', color: 'var(--k-ink2)' };
                return (
                  <li key={o.slot.id}>
                    <GlassSurface
                      className="flex items-center gap-3 rounded-tile py-1.5 pl-3.5 pr-1.5"
                      style={{
                        opacity: st === 'missed' ? 0.5 : 1,
                        borderColor: st === 'current' ? withAlpha(c.color, 0.6) : undefined,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => editBlock(o.slot)}
                        className="flex min-h-13 flex-1 items-center gap-3 text-left"
                      >
                        <span className="w-10.5 mono-num text-caption text-ink2">
                          {f.clock(o.slot.startMin)}
                        </span>
                        <span
                          aria-hidden="true"
                          className="h-8.5 w-1 rounded-xs"
                          style={{ background: c.color, boxShadow: `0 0 10px ${c.color}` }}
                        />
                        <span className="flex flex-1 flex-col gap-0.5">
                          <span className="text-body font-semibold">
                            {c.name}
                            {o.slot.once ? ` · ${t('common.oneOff')}` : ''}
                          </span>
                          <span className="mono-num text-label text-ink3">
                            {f.clock(o.slot.startMin)} – {f.clock(o.slot.endMin)} ·{' '}
                            {f.duration(o.durationMin)}
                            {total ? ` · ${t('today.steps', { done, total })}` : ''}
                          </span>
                        </span>
                      </button>
                      <Pressable
                        haptic
                        onClick={() => rowAction(o)}
                        aria-label={
                          st === 'current'
                            ? t('today.action.current')
                            : st === 'done' || st === 'missed'
                              ? t('today.action.undo')
                              : t('today.action.done')
                        }
                        className={`flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-pill px-3 text-caption font-semibold ${
                          st === 'missed' ? 'text-alert' : ''
                        }`}
                        style={chip}
                      >
                        {rowLabel(o)}
                      </Pressable>
                    </GlassSurface>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
