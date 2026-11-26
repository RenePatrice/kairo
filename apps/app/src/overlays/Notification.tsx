import { dateKey, isPerfectDay, minuteOfDay, occurrencesOn, remindersAt } from '@kairo/core';
import { setCheck, useDb } from '@kairo/db';
import {
  Button,
  GlassSurface,
  activityPalette,
  inkFor,
  transitionFor,
  useAppearance,
} from '@kairo/ui';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '@kairo/platform';
import { useCheckIns } from '../lib/checkins';
import { useAppData } from '../lib/data';
import { useFormat } from '../lib/format';
import { useNow } from '../lib/useNow';
import { useUi } from '../store';

const SNOOZE_MS = 10 * 60_000;
const CELEBRATION_MS = 2800;
const CELEBRATED_KEY = 'kairo.celebrated';

/**
 * Rappels dans l'app (bannière « KAIRO · MAINTENANT ») quand l'app est ouverte, et fête
 * de la « Journée parfaite ». Les notifications système sont programmées par ReminderScheduler.
 */
export function ReminderWatcher() {
  const { settings, blocks, checks, restDays } = useAppData();
  const setNotif = useUi((s) => s.setNotif);
  const celebrate = useUi((s) => s.celebrate);
  const now = useNow(15_000);
  const fired = useRef(new Set<string>());
  const notifications = useNotifications();
  const permission = useUi((s) => s.notifPermission);
  // APK / iOS autorisés : les notifications système sonnent déjà, même app ouverte.
  const systemHandles = notifications.background && permission === 'granted';
  const minute = minuteOfDay(now);
  const day = dateKey(now);

  useEffect(() => {
    if (systemHandles || !settings.started || restDays.has(day)) return;
    const due = remindersAt(blocks, now, minute, {
      remind: settings.options.remind,
      endCheck: settings.options.endCheck,
      checks,
    });
    for (const r of due) {
      const key = `${day}|${r.occurrence.slot.id}|${r.kind}|${minute}`;
      if (fired.current.has(key)) continue;
      fired.current.add(key);
      setNotif(
        r.kind === 'start'
          ? { kind: 'start', blockId: r.occurrence.slot.id, lead: r.lead }
          : { kind: 'end', blockId: r.occurrence.slot.id, lead: 0 },
      );
    }
    // `now` change toutes les 15 s ; la minute et le jour suffisent comme clés.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minute, day, blocks, checks, restDays, settings, setNotif, systemHandles]);

  useEffect(() => {
    if (!isPerfectDay(blocks, new Date(), checks)) return;
    const today = dateKey(new Date());
    if (localStorage.getItem(CELEBRATED_KEY) === today) return;
    localStorage.setItem(CELEBRATED_KEY, today);
    celebrate();
  }, [blocks, checks, celebrate]);

  return null;
}

/** Bannière de rappel de la maquette, en verre, en haut de l'écran. */
export function NotificationBanner() {
  const { t } = useTranslation('app');
  const db = useDb();
  const f = useFormat();
  const { reduceMotion } = useAppearance();
  const { blocks, categoryOf } = useAppData();
  const notif = useUi((s) => s.notif);
  const setNotif = useUi((s) => s.setNotif);
  const flash = useUi((s) => s.flash);
  const go = useUi((s) => s.go);
  const block = notif ? blocks.find((b) => b.id === notif.blockId) : undefined;
  const { focus } = useCheckIns();
  const focusBlock = (id: string) => {
    const [occ] = occurrencesOn(
      blocks.filter((b) => b.id === id),
      new Date(),
    );
    if (occ) focus(occ);
  };

  const content = (() => {
    if (!notif || !block) return null;
    const cat = categoryOf(block.categoryId);
    const title =
      notif.kind === 'end'
        ? t('notif.ended', { name: cat.name })
        : notif.lead
          ? t('notif.inMinutes', { name: cat.name, n: notif.lead })
          : t('notif.starts', { name: cat.name });
    const body =
      notif.kind === 'end'
        ? t('notif.howDidItGo')
        : `${f.clock(block.startMin)} – ${f.clock(block.endMin)}`;
    const check = (status: 'done' | 'missed') => async () => {
      const day = dateKey(new Date());
      await setCheck(db, day, block.id, status);
      if (status === 'done') useUi.getState().setRate({ day, blockId: block.id, name: cat.name });
      setNotif(null);
      go('today');
    };
    const actions =
      notif.kind === 'end'
        ? [
            { label: t('today.done'), primary: true, run: check('done') },
            { label: t('today.missed'), run: check('missed') },
            { label: t('notif.later'), run: () => setNotif(null) },
          ]
        : [
            {
              label: t('notif.focus'),
              run: () => focusBlock(block.id),
            },
            {
              label: t('notif.plus10'),
              run: () => {
                setNotif(null);
                flash(t('notif.snooze'));
                window.setTimeout(
                  () => setNotif({ kind: 'start', blockId: block.id, lead: 0 }),
                  SNOOZE_MS,
                );
              },
            },
            { label: t('notif.ok'), run: () => setNotif(null) },
          ];
    return (
      <motion.div
        key={`${notif.kind}-${block.id}`}
        role="alert"
        className="fixed inset-x-2.5 top-[max(0.75rem,env(safe-area-inset-top))] z-40 mx-auto max-w-120"
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20 }}
        transition={transitionFor('bouncy', reduceMotion)}
      >
        <GlassSurface
          level="thick"
          className="flex flex-col gap-3 rounded-wide p-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.35)]"
        >
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex size-10 flex-none items-center justify-center rounded-icon font-bold"
              style={{ background: cat.color, color: inkFor(cat.color) }}
            >
              {cat.name.charAt(0).toUpperCase()}
            </span>
            <span className="flex flex-1 flex-col gap-0.5">
              <span className="mono-num text-micro tracking-[0.1em] text-ink3">
                {t('notif.tag')}
              </span>
              <span className="text-body font-bold">{title}</span>
              <span className="text-small text-ink2">{body}</span>
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {actions.map((a) => (
              <Button
                key={a.label}
                size="sm"
                variant={'primary' in a && a.primary ? 'primary' : 'ghost'}
                onClick={() => void a.run()}
              >
                {a.label}
              </Button>
            ))}
          </div>
        </GlassSurface>
      </motion.div>
    );
  })();

  return <AnimatePresence>{content}</AnimatePresence>;
}

/** « Journée parfaite. » : confettis aux couleurs des activités. */
export function Celebration() {
  const { t } = useTranslation('app');
  const at = useUi((s) => s.celebrateAt);
  const now = useNow(500);
  if (!at || now.getTime() - at > CELEBRATION_MS) return null;
  return (
    <>
      <div aria-hidden="true" className="pointer-events-none fixed left-1/2 top-[40%] z-40 size-0">
        {Array.from({ length: 18 }, (_, q) => (
          <span
            key={q}
            className="absolute left-0 top-0"
            style={{ transform: `rotate(${q * 20 + (q % 2 ? 6 : 0)}deg)` }}
          >
            <span
              className="-m-1.25 block animate-burst"
              style={{
                width: q % 3 === 0 ? 12 : 8,
                height: q % 3 === 0 ? 12 : 8,
                borderRadius: q % 2 ? '50%' : 3,
                background: activityPalette[q % activityPalette.length]?.hex,
                animationDuration: `${1 + (q % 4) * 0.18}s`,
              }}
            />
          </span>
        ))}
      </div>
      <div role="status" className="pointer-events-none fixed inset-x-5 top-30 z-40 text-center">
        <span className="headline block text-numeral">
          <em>{t('today.perfectA')}</em>
        </span>
        <span className="text-chip text-ink2">{t('today.perfectB')}</span>
      </div>
    </>
  );
}
