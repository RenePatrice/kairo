import {
  checkKey,
  focusRemaining,
  pauseFocus,
  resumeFocus,
  setPomodoro,
  splitDuration,
  tickPomodoro,
} from '@kairo/core';
import { countFocusSession, setCheck, toggleStep, useDb } from '@kairo/db';
import {
  Button,
  GlassSurface,
  Icon,
  inkFor,
  Overlay,
  OverlayClose,
  Pressable,
  shade,
  status,
  withAlpha,
} from '@kairo/ui';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppData } from '../lib/data';
import { useFormat } from '../lib/format';
import { useNow } from '../lib/useNow';
import { useUi } from '../store';

const RING = 2 * Math.PI * 142;
const pad = (n: number) => String(n).padStart(2, '0');

/** Mode focus de la maquette : orbe qui respire, compte à rebours, Pomodoro 25/5, étapes. */
export function FocusMode() {
  const { t } = useTranslation('app');
  const db = useDb();
  const f = useFormat();
  const { blocks, categoryOf, steps } = useAppData();
  const session = useUi((s) => s.focus);
  const day = useUi((s) => s.focusDay);
  const setFocus = useUi((s) => s.setFocus);
  const flash = useUi((s) => s.flash);
  const now = useNow(1000);
  const nowMs = now.getTime();

  useEffect(() => {
    if (!session?.pomodoro) return;
    const { session: next, changed } = tickPomodoro(session, nowMs);
    if (changed) {
      useUi.setState({ focus: next });
      flash(changed === 'break' ? t('focus.toBreak') : t('focus.toWork'));
    }
  }, [session, nowMs, flash, t]);

  const block = session ? blocks.find((b) => b.id === session.slotId) : undefined;
  const cat = block ? categoryOf(block.categoryId) : null;
  const color = cat?.color ?? status.success;
  const ink = inkFor(color);
  const close = () => setFocus(null);

  const content = (() => {
    if (!session) return null;
    const { leftMs, progress } = focusRemaining(session, nowMs);
    const { h, m, s } = splitDuration(leftMs);
    const pomo = session.pomodoro;
    const time = pomo
      ? `${pad(m + h * 60)}:${pad(s)}`
      : `${h ? `${h}:${pad(m)}` : pad(m)}:${pad(s)}`;
    const paused = session.pausedLeft !== null;
    const sub = pomo
      ? t(pomo.phase === 'work' ? 'focus.work' : 'focus.break', { n: pomo.cycles + 1 })
      : leftMs <= 0
        ? t('focus.over')
        : paused
          ? t('focus.paused')
          : t('focus.left', { end: f.clock(block?.endMin ?? 0) });
    const done = day && block ? (steps[checkKey(day, block.id)] ?? []) : [];

    const finish = async () => {
      if (block && day) {
        await setCheck(db, day, block.id, 'done');
        await countFocusSession(db);
        useUi
          .getState()
          .setRate({ day, blockId: block.id, name: categoryOf(block.categoryId).name });
      }
      setFocus(null);
      useUi.getState().go('today');
    };

    return (
      <div className="relative flex h-full flex-col items-center gap-4.5 overflow-y-auto px-6 pb-8.5 pt-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(circle at 50% 40%, ${withAlpha(color, 0.35)}, transparent 60%)`,
          }}
        />
        <div className="relative flex w-full items-center justify-between">
          <GlassSurface
            as="span"
            className="rounded-chip px-2.5 py-1.5 mono-num text-micro tracking-[0.14em] text-ink2"
          >
            {t('focus.dnd')}
          </GlassSurface>
          <GlassSurface className="rounded-pill">
            <OverlayClose
              aria-label={t('focus.quit')}
              className="flex size-11 items-center justify-center rounded-pill"
            >
              <Icon name="close" size={18} />
            </OverlayClose>
          </GlassSurface>
        </div>
        <span className="eyebrow relative mt-2.5" style={{ color }}>
          {t('focus.oneThing')}
        </span>
        <h2 className="headline relative text-center text-numeral">
          <em>{cat?.name ?? t('focus.fallback')}</em>
        </h2>
        <div className="relative mt-1.5 size-75 flex-none">
          <div
            aria-hidden="true"
            className="absolute inset-10 animate-orb rounded-pill"
            style={{
              background: `radial-gradient(circle at 35% 30%, ${shade(color, 0.55)}, ${color} 45%, ${shade(color, -0.45)})`,
              boxShadow: `0 0 90px ${withAlpha(color, 0.35)}`,
              animationPlayState: paused ? 'paused' : 'running',
            }}
          />
          <svg
            width="300"
            height="300"
            viewBox="0 0 300 300"
            aria-hidden="true"
            className="absolute inset-0"
          >
            <circle cx="150" cy="150" r="142" fill="none" stroke="var(--k-track)" strokeWidth="4" />
            <circle
              cx="150"
              cy="150"
              r="142"
              fill="none"
              stroke="var(--k-ink)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${(RING * progress).toFixed(1)} ${RING.toFixed(1)}`}
              transform="rotate(-90 150 150)"
            />
          </svg>
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-1"
            style={{ color: ink }}
            role="timer"
            aria-live="off"
          >
            <span className="num text-focus">{time}</span>
            <span className="mono-num text-label opacity-75">{sub}</span>
          </div>
        </div>
        <GlassSurface className="relative grid w-60 grid-cols-2 gap-0.75 rounded-field p-0.75">
          {[false, true].map((on) => {
            const sel = Boolean(pomo) === on;
            return (
              <Pressable
                key={String(on)}
                haptic
                aria-pressed={sel}
                onClick={() => useUi.setState({ focus: setPomodoro(session, on, Date.now()) })}
                className={`h-8.5 rounded-chip text-center text-caption font-semibold ${
                  sel ? 'bg-inv text-inv-ink' : 'text-ink2'
                }`}
              >
                {on ? t('focus.pomodoro') : t('focus.continuous')}
              </Pressable>
            );
          })}
        </GlassSurface>
        {block?.steps.length && day ? (
          <GlassSurface className="no-scrollbar relative flex max-h-37.5 w-full flex-col overflow-y-auto rounded-tile px-3 py-2">
            {block.steps.map((label, i) => {
              const on = done.includes(i);
              return (
                <Pressable
                  key={`${i}-${label}`}
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => void toggleStep(db, day, block.id, i)}
                  className="flex min-h-11 items-center gap-2.5 text-left"
                >
                  <span
                    aria-hidden="true"
                    className="flex size-5.5 items-center justify-center rounded-block border-[1.5px] text-small font-bold"
                    style={{
                      borderColor: on ? status.success : 'var(--k-ink3)',
                      background: on ? status.success : 'transparent',
                      color: status.successInk,
                    }}
                  >
                    {on ? <Icon name="check" size={14} /> : null}
                  </span>
                  <span
                    className="flex-1 text-chip"
                    style={{ textDecoration: on ? 'line-through' : 'none', opacity: on ? 0.55 : 1 }}
                  >
                    {label}
                  </span>
                </Pressable>
              );
            })}
          </GlassSurface>
        ) : (
          <span className="relative font-serif text-lead italic text-ink2">
            {block?.note || t('focus.calm')}
          </span>
        )}
        <div className="relative mt-auto flex w-full gap-2.5">
          <Button
            variant="ghost"
            className="h-14 flex-1"
            onClick={() =>
              useUi.setState({
                focus: paused ? resumeFocus(session, Date.now()) : pauseFocus(session, Date.now()),
              })
            }
          >
            {paused ? t('focus.resume') : t('focus.pause')}
          </Button>
          <Button
            className="h-14 flex-1"
            style={{ background: color, color: ink }}
            onClick={() => void finish()}
          >
            {t('focus.finish')}
          </Button>
        </div>
      </div>
    );
  })();

  return (
    <Overlay open={session !== null} onClose={close} label={t('focus.dialog')}>
      {content}
    </Overlay>
  );
}
