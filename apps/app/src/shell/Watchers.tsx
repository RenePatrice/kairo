/**
 * Veilleurs sans interface (maquette : `autoReviews` et `checkTrophies` à chaque tic) :
 * bilans rédigés automatiquement s'ils sont oubliés, et annonce des trophées débloqués.
 */
import {
  addDays,
  autoReviewsDue,
  dateKey,
  dayReview,
  firstCheckDay,
  newTrophies,
  parseDateKey,
  reminderId,
  upcomingReminders,
  weekKey,
  weekReview,
} from '@kairo/core';
import {
  addGoals,
  applyDueRecurring,
  addReviews,
  markTrophiesSeen,
  useDb,
  useEnergy,
  useGoals,
  useReviews,
} from '@kairo/db';
import { useBack, useNotifications } from '@kairo/platform';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toDayGoal, toWeekGoal, useBilans } from '../lib/bilans';
import { useAppData } from '../lib/data';
import { useFormat } from '../lib/format';
import { dayReviewText, weekReviewText } from '../lib/reviewText';
import { useNow } from '../lib/useNow';
import { useUi } from '../store';

export function Watchers() {
  const now = useNow(60_000);
  return (
    <>
      <AutoReviewWatcher now={now} />
      <TrophyWatcher now={now} />
      <ReminderScheduler now={now} />
      <BackButton />
      <RecurringWatcher now={now} />
    </>
  );
}

/** Bilans auto : chaque jour passé (aujourd'hui après 23 h), et la semaine le dimanche soir. */
function AutoReviewWatcher({ now }: { now: Date }) {
  const { t } = useTranslation('app');
  const db = useDb();
  const f = useFormat();
  const { settings, blocks, checks, restDays, categoryOf } = useAppData();
  const energy = useEnergy();
  const goals = useGoals();
  const reviews = useReviews();
  const running = useRef(false);
  const enabled = settings.options.autoReview && blocks.length > 0;

  useEffect(() => {
    if (!enabled || !energy || !goals || !reviews || running.current) return;
    const history = { checks, restDays, since: firstCheckDay(checks) };
    const plan = autoReviewsDue(
      { slots: blocks, history, now },
      new Set(Object.keys(reviews)),
      weekKey,
    );
    if (!plan.days.length && !plan.weeks.length) return;
    running.current = true;
    const input = { slots: blocks, history, energy, now };
    const nameOf = (id: string) => categoryOf(id).name;
    const dayRows = plan.days.map((k) => {
      const facts = dayReview(parseDateKey(k), input, toDayGoal(goals[`D${k}`]));
      return { id: `D${k}`, mood: facts.mood, ...dayReviewText(facts, t, f, nameOf), ai: true };
    });
    const weekRows = plan.weeks.map((w) => {
      const facts = weekReview(w.date, input, toWeekGoal(goals[w.key]));
      const text = weekReviewText(facts, t, f, nameOf);
      return {
        review: {
          id: w.key,
          mood: facts.mood,
          summary: text.summary,
          a: text.a,
          b: text.b,
          ai: true,
        },
        next: {
          id: weekKey(addDays(w.date, 7)),
          scope: 'W' as const,
          kind: facts.nextGoal.kind,
          target: facts.nextGoal.target,
          categoryId: facts.nextGoal.categoryId ?? null,
          text: text.next,
        },
      };
    });
    void (async () => {
      try {
        const n = await addReviews(db, [...dayRows, ...weekRows.map((w) => w.review)]);
        await addGoals(
          db,
          weekRows.map((w) => w.next),
        );
        if (n) {
          useUi
            .getState()
            .flash(t('announce.autoReviews', { count: n }), t('announce.view'), () => {
              const ui = useUi.getState();
              ui.clearToast();
              ui.setStatTab('day');
              ui.go('stats');
            });
        }
      } finally {
        running.current = false;
      }
    })();
  }, [enabled, now, blocks, checks, restDays, energy, goals, reviews, db, t, f, categoryOf]);

  return null;
}

/** « Trophée débloqué : … » dès qu'une condition est remplie. */
function TrophyWatcher({ now }: { now: Date }) {
  const { t } = useTranslation('app');
  const db = useDb();
  const { settings } = useAppData();
  const { trophies } = useBilans(now);
  const fresh = settings.started ? newTrophies(trophies, settings.trophiesSeen) : [];
  const key = fresh.join(',');
  // On attend qu'aucun autre message ne soit affiché : l'annonce ne remplace pas une confirmation.
  const busy = useUi((s) => s.toast !== null);

  useEffect(() => {
    if (!key || busy) return;
    const ids = key.split(',');
    void markTrophiesSeen(db, ids).then(() => {
      const [first] = ids;
      const name = first
        ? (t(`stats.trophies.${first}`, { returnObjects: true }) as string[])[0]
        : '';
      useUi
        .getState()
        .flash(
          ids.length > 1
            ? t('announce.trophies', { count: ids.length })
            : t('announce.trophy', { name }),
          t('announce.view'),
          () => {
            const ui = useUi.getState();
            ui.clearToast();
            ui.setStatTab('trophy');
            ui.go('stats');
          },
        );
    });
  }, [key, busy, db, t]);

  return null;
}

/** Reprogramme les rappels toutes les 30 min (sur le web, seuls les 24 h à venir sont minutés). */
const RESCHEDULE_MS = 30 * 60_000;

/**
 * Rappels système des 3 prochains jours (début N minutes avant, « Fait ou raté ? » à la fin),
 * reprogrammés à chaque changement du planning. Sur l'APK, ils sonnent même app fermée.
 */
function ReminderScheduler({ now }: { now: Date }) {
  const { t } = useTranslation('app');
  const f = useFormat();
  const notifications = useNotifications();
  const { settings, blocks, checks, restDays, categoryOf } = useAppData();
  const permission = useUi((s) => s.notifPermission);
  const setPermission = useUi((s) => s.setNotifPermission);
  const slot = Math.floor(now.getTime() / RESCHEDULE_MS);
  const { remind, endCheck } = settings.options;

  useEffect(() => {
    void notifications.permission().then(setPermission);
  }, [notifications, setPermission]);

  useEffect(() => {
    if (permission !== 'granted') return;
    const on = settings.started && (remind || endCheck);
    const list = on
      ? upcomingReminders(blocks, new Date(), { remind, endCheck, checks, restDays }).flatMap(
          (r) => {
            const block = blocks.find((b) => b.id === r.slotId);
            if (!block) return [];
            const name = categoryOf(block.categoryId).name;
            return [
              {
                id: reminderId(r.key),
                at: r.at,
                title:
                  r.kind === 'end'
                    ? t('notif.ended', { name })
                    : r.lead
                      ? t('notif.inMinutes', { name, n: r.lead })
                      : t('notif.starts', { name }),
                body:
                  r.kind === 'end'
                    ? t('notif.howDidItGo')
                    : `${f.clock(block.startMin)} – ${f.clock(block.endMin)}`,
              },
            ];
          },
        )
      : [];
    void notifications.schedule(list);
    // `slot` relance la programmation toutes les 30 minutes.
  }, [
    permission,
    settings.started,
    remind,
    endCheck,
    blocks,
    checks,
    restDays,
    categoryOf,
    notifications,
    t,
    f,
    slot,
  ]);

  return null;
}

/** Écran précédent de l'accueil, pour le bouton Retour. */
const ONBOARDING_BACK = { rhythm: 'welcome', acts: 'rhythm' } as const;

/**
 * Bouton Retour d'Android : ferme d'abord la fiche, puis l'écran plein (récap, focus,
 * assistant), la bannière, revient à l'étape ou à l'onglet Aujourd'hui ; sinon l'app passe en
 * arrière-plan (elle ne se ferme pas).
 */
function BackButton() {
  const back = useBack();
  const { settings } = useAppData();
  // Lu au moment de l'appui : le mode a pu changer depuis l'abonnement.
  const modeRef = useRef(settings.mode);
  useEffect(() => {
    modeRef.current = settings.mode;
  }, [settings.mode]);
  useEffect(
    () =>
      back.onBack(() => {
        const ui = useUi.getState();
        if (ui.sheet) ui.closeSheet();
        else if (ui.recap !== null) ui.setRecap(null);
        else if (ui.focus) ui.setFocus(null);
        else if (ui.assistant) ui.setAssistant(false);
        else if (ui.notif) ui.setNotif(null);
        else if (ui.screen === 'rhythm' || ui.screen === 'acts') ui.go(ONBOARDING_BACK[ui.screen]);
        else if (ui.screen === 'ops' || ui.screen === 'envelopes') ui.go('money');
        else if (ui.screen === 'week' || ui.screen === 'stats') ui.go('today');
        else if (ui.screen === 'me') ui.go(modeRef.current === 'budget' ? 'money' : 'today');
        else return false;
        return true;
      }),
    [back],
  );
  return null;
}

/** Budget : ajoute les échéances récurrentes du jour (loyer, salaire…) une fois par jour. */
function RecurringWatcher({ now }: { now: Date }) {
  const db = useDb();
  const { settings } = useAppData();
  const day = dateKey(now);
  useEffect(() => {
    if (settings.currency) void applyDueRecurring(db, day);
  }, [db, day, settings.currency]);
  return null;
}
