/**
 * Logique de l'assistant (maquette : `reply`, `send`, `runAction`, `aiInsights`, `aiTiles`,
 * `aiChips2`). Les demandes passent d'abord par le moteur de règles de @kairo/ai ; toute
 * proposition est enregistrée « pending » et n'est appliquée qu'au toucher « Ajouter ».
 */
import { parseRequest, planSuggestion, type AiSuggestion, type AssistantContext } from '@kairo/ai';
import {
  activityWeek,
  dailyHistory,
  dateKey,
  dayReview,
  energyByMoment,
  firstCheckDay,
  freeSlotsFrom,
  minuteOfDay,
  momentum,
  normalizeMinute,
  nowAndNext,
  occurrencesOn,
  pendingCheckIns,
  startOfWeek,
  streak,
  weekInsight,
  WEAK_RATIO,
  type Occurrence,
} from '@kairo/core';
import {
  SuggestionError,
  applySuggestion,
  saveReview,
  saveSuggestion,
  updateOptions,
  useDb,
  useEnergy,
  useGoals,
  uuidv7,
  type Block,
} from '@kairo/db';
import { activityPalette } from '@kairo/ui';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { emptyActForm, useUi, type AiAction, type AiMessage, type AiSlot } from '../store';
import { DEFAULT_REMINDER } from './actions';
import { useCheckIns } from './checkins';
import { useAppData } from './data';
import { useFormat } from './format';
import { dayReviewText, insightText } from './reviewText';

/** Délai de « réflexion » de la maquette avant la réponse (premier retour visible < 1 s). */
export const THINK_MS = 700;
const PALETTE = activityPalette.map((c) => c.hex);
const paletteHex = (key: string): string =>
  activityPalette.find((c) => c.key === key)?.hex ?? activityPalette[0].hex;

type AiReply = Extract<AiMessage, { role: 'ai' }>;

export function useAssistant() {
  const { t } = useTranslation('app');
  const db = useDb();
  const f = useFormat();
  const data = useAppData();
  const liveEnergy = useEnergy();
  const liveGoals = useGoals();
  const energy = useMemo(() => liveEnergy ?? {}, [liveEnergy]);
  const goals = useMemo(() => liveGoals ?? {}, [liveGoals]);
  const { focus } = useCheckIns();
  const ui = useUi();
  const { settings, categories, blocks, checks, restDays, categoryOf } = data;
  const rhythm = useMemo(
    () => ({ wakeMin: settings.profile.wakeMin, sleepMin: settings.profile.sleepMin }),
    [settings.profile.wakeMin, settings.profile.sleepMin],
  );
  const history = useMemo(
    () => ({ checks, restDays, since: firstCheckDay(checks) }),
    [checks, restDays],
  );

  const context = useCallback(
    (now: Date): AssistantContext => ({
      now,
      locale: f.locale,
      rhythm,
      categories,
      blocks,
      palette: PALETTE,
      newId: uuidv7,
    }),
    [f.locale, rhythm, categories, blocks],
  );

  /** Régularité, tendance et lecture de la semaine, partagées par « Analyse » et les stats. */
  const weekFacts = useCallback(
    (now: Date) => {
      const daily = dailyHistory(blocks, now, history);
      const acts = activityWeek(blocks, categories, startOfWeek(now), checks);
      const insight = weekInsight(
        acts,
        daily,
        energyByMoment(energy, blocks),
        Object.keys(checks).length > 0,
      );
      return {
        m: momentum(daily),
        acts,
        insight: insightText(insight, t, f, (id) => categoryOf(id).name),
      };
    },
    [blocks, history, categories, checks, energy, t, f, categoryOf],
  );

  const reply = useCallback(
    async (q: string): Promise<AiReply> => {
      const now = new Date();
      const nowMin = minuteOfDay(now);
      const ctx = context(now);
      const base = { id: uuidv7(), role: 'ai' as const };
      const intent = parseRequest(q, ctx);
      const nameOf = (id: string | null) => (id ? categoryOf(id).name : null);

      switch (intent.intent) {
        case 'free_time': {
          const free = freeSlotsFrom(blocks, now, rhythm, intent.length, nowMin);
          const name = nameOf(intent.categoryId);
          if (!free.length) {
            return {
              ...base,
              text: t('assistant.reply.full'),
              actions: [
                {
                  kind: 'prompt',
                  label: t('assistant.reply.tomorrow'),
                  q: t('assistant.reply.tomorrowQ', { name: name ?? t('assistant.reply.aSlot') }),
                },
              ],
            };
          }
          const slots: AiSlot[] = free.slice(0, 4).map((g) => ({
            startMin: normalizeMinute(g.startMin),
            endMin: normalizeMinute(Math.min(g.endMin, g.startMin + intent.length)),
            len: t('assistant.reply.freeLen', { len: f.duration(g.endMin - g.startMin) }),
            categoryId: intent.categoryId,
          }));
          return {
            ...base,
            text: name ? t('assistant.reply.freeFor', { name }) : t('assistant.reply.free'),
            slots,
          };
        }
        case 'analysis': {
          const { m, insight } = weekFacts(now);
          if (m.current === null) return { ...base, text: t('assistant.reply.noHistory') };
          const trend =
            m.trend === null
              ? ''
              : t('assistant.reply.trend', { sign: m.trend >= 0 ? '+' : '', n: m.trend });
          return {
            ...base,
            text: t('assistant.reply.analysis', {
              pct: Math.round(m.current * 100),
              trend,
              insight,
            }),
            actions: [
              { kind: 'stats', label: t('assistant.reply.seeReviews') },
              { kind: 'wgoal', label: t('assistant.reply.setGoal'), ghost: true },
            ],
          };
        }
        case 'day_review': {
          const today = occurrencesOn(blocks, now);
          const ended = today.filter((o) => o.end <= now).length;
          if (!ended) {
            return {
              ...base,
              text: today.length
                ? t('assistant.reply.noneEnded', { count: today.length })
                : t('assistant.reply.nothingToday'),
              actions: settings.options.autoReview
                ? []
                : [{ kind: 'auto', label: t('assistant.reply.enableAuto') }],
            };
          }
          const goal = goals[`D${dateKey(now)}`];
          const facts = dayReview(
            now,
            { slots: blocks, history, energy, now },
            goal?.scope === 'D' ? goal : undefined,
          );
          const text = dayReviewText(facts, t, f, (id) => categoryOf(id).name);
          return {
            ...base,
            text: `${text.summary} ${text.a} ${text.b}`,
            actions: [
              { kind: 'saveReview', label: t('assistant.reply.saveReview') },
              { kind: 'review', label: t('assistant.reply.writeMyself'), ghost: true },
            ],
          };
        }
        case 'stats': {
          const { m, insight } = weekFacts(now);
          if (m.current === null) return { ...base, text: t('assistant.reply.noData') };
          return {
            ...base,
            text: t('assistant.reply.stats', {
              pct: Math.round(m.current * 100),
              streak: streak(blocks, now, history).current,
              insight,
            }),
            actions: [{ kind: 'stats', label: t('assistant.reply.seeReviews') }],
          };
        }
        case 'need_time': {
          const name = nameOf(intent.categoryId);
          return {
            ...base,
            text: t('assistant.reply.needTime', { q }),
            actions: [
              {
                kind: 'prompt',
                label: t('assistant.reply.myFree'),
                q: name
                  ? t('assistant.reply.freeTodayFor', { name })
                  : t('assistant.reply.freeToday'),
              },
            ],
          };
        }
        case 'needs_model':
          // Llama (relais ou téléphone) prendra ces demandes en charge (tâches 8 et 9).
          return { ...base, text: t('assistant.reply.needsModel') };
        case 'plan': {
          const suggestion = planSuggestion(intent, ctx, t('assistant.reply.newActivity'));
          await saveSuggestion(db, suggestion);
          const text = intent.categoryId
            ? t('assistant.reply.planKnown', { name: categoryOf(intent.categoryId).name })
            : t('assistant.reply.planNew', {
                name: intent.newName ?? t('assistant.reply.newActivity'),
              });
          return { ...base, text, suggestion };
        }
      }
    },
    [
      context,
      blocks,
      rhythm,
      t,
      f,
      weekFacts,
      settings.options.autoReview,
      goals,
      history,
      energy,
      categoryOf,
      db,
    ],
  );

  const send = useCallback(
    (raw?: string) => {
      const q = (raw ?? useUi.getState().chat.text).trim();
      if (!q || useUi.getState().chat.thinking) return;
      ui.pushMessages([{ id: uuidv7(), role: 'user', text: q }], { text: '', thinking: true });
      window.setTimeout(() => {
        void reply(q).then((m) => ui.pushMessages([m], { thinking: false }));
      }, THINK_MS);
    },
    [reply, ui],
  );

  /** « Ajouter » : applique la proposition d'un bloc, annulable 5 s. */
  const apply = useCallback(
    async (msgId: string, suggestion: AiSuggestion) => {
      try {
        const undo = await applySuggestion(db, suggestion.id);
        ui.patchMessage(msgId, { suggestion: { ...suggestion, status: 'applied' } });
        ui.pushMessages([
          {
            id: uuidv7(),
            role: 'ai',
            text: t('assistant.reply.addedMsg'),
            actions: [{ kind: 'week', label: t('assistant.reply.seeWeek'), ghost: true }],
          },
        ]);
        ui.flash(t('assistant.addedToast'), t('common.undo'), async () => {
          await undo();
          ui.patchMessage(msgId, { suggestion: { ...suggestion, status: 'pending' } });
        });
      } catch (e) {
        if (!(e instanceof SuggestionError)) throw e;
        ui.pushMessages([{ id: uuidv7(), role: 'ai', text: t('assistant.reply.gone') }]);
      }
    },
    [db, ui, t],
  );

  const openSlotSheet = useCallback(
    (form: {
      categoryId: string | null;
      days: number[];
      once: string | null;
      startMin: number;
      endMin: number;
      reminderMin: number;
    }) => {
      const blockForm = {
        id: null,
        ...form,
        categoryId: form.categoryId ?? categories[0]?.id ?? null,
        steps: [],
        note: '',
        stepInput: '',
      };
      if (!blockForm.categoryId) {
        useUi.setState({ blockForm });
        ui.openAct(emptyActForm(categories.length), 'block');
        return;
      }
      ui.openBlock(blockForm);
    },
    [categories, ui],
  );

  /** « Ajuster » : ouvre la fiche créneau préremplie avec la proposition. */
  const adjust = useCallback(
    (suggestion: AiSuggestion) => {
      const add = suggestion.operations.find((o) => o.op === 'add');
      if (add?.op !== 'add') return;
      const known = categories.some((c) => c.id === add.block.categoryId);
      openSlotSheet({
        categoryId: known ? add.block.categoryId : null,
        days: add.block.days,
        once: add.block.once,
        startMin: add.block.startMin,
        endMin: add.block.endMin,
        reminderMin: add.block.reminderMin ?? DEFAULT_REMINDER,
      });
    },
    [categories, openSlotSheet],
  );

  /** « Réserver → » : créneau ponctuel aujourd'hui dans ce moment libre, rappel 5 min avant. */
  const book = useCallback(
    (slot: AiSlot) =>
      openSlotSheet({
        categoryId: slot.categoryId,
        days: [],
        once: dateKey(new Date()),
        startMin: slot.startMin,
        endMin: slot.endMin,
        reminderMin: 5,
      }),
    [openSlotSheet],
  );

  const runAction = useCallback(
    async (ac: AiAction) => {
      const leave = (screen: 'stats' | 'week') => {
        ui.setAssistant(false);
        ui.go(screen);
      };
      switch (ac.kind) {
        case 'prompt':
          return send(ac.q);
        case 'stats':
        case 'wgoal':
        case 'review':
          // Les fiches Objectif et Bilan arrivent avec l'onglet Bilans (tâche 5).
          return leave('stats');
        case 'week':
          return leave('week');
        case 'auto':
          await updateOptions(db, { autoReview: true });
          return ui.pushMessages([{ id: uuidv7(), role: 'ai', text: t('assistant.reply.autoOn') }]);
        case 'saveReview': {
          const now = new Date();
          const goal = goals[`D${dateKey(now)}`];
          const facts = dayReview(
            now,
            { slots: blocks, history, energy, now },
            goal?.scope === 'D' ? goal : undefined,
          );
          const text = dayReviewText(facts, t, f, (id) => categoryOf(id).name);
          await saveReview(db, { id: `D${dateKey(now)}`, mood: facts.mood, ...text, ai: true });
          return ui.pushMessages([
            {
              id: uuidv7(),
              role: 'ai',
              text: t('assistant.reply.reviewSaved'),
              actions: [{ kind: 'stats', label: t('assistant.reply.seeReviews'), ghost: true }],
            },
          ]);
        }
      }
    },
    [send, ui, db, t, goals, blocks, history, energy, f, categoryOf],
  );

  return { send, apply, adjust, book, runAction, focus, weekFacts, rhythm };
}

export interface InsightCardData {
  key: string;
  tag: string;
  color: string;
  title: string;
  sub: string;
  cta: string;
  go: () => void;
}

/** Cartes « Ce que je remarque » (maquette : `aiInsights`). */
export function useInsights(
  now: Date,
  actions: {
    send: (q: string) => void;
    focus: (o: Occurrence<Block>) => void;
    weekFacts: ReturnType<typeof useAssistant>['weekFacts'];
    rhythm: { wakeMin: number; sleepMin: number };
  },
): InsightCardData[] {
  const { t } = useTranslation('app');
  const f = useFormat();
  const { blocks, checks, categoryOf } = useAppData();
  const ui = useUi();
  const nowMin = minuteOfDay(now);
  const today = occurrencesOn(blocks, now);
  const { current, next } = nowAndNext(blocks, now);
  const cards: InsightCardData[] = [];

  if (current) {
    const c = categoryOf(current.slot.categoryId);
    cards.push({
      key: 'now',
      tag: t('assistant.insight.nowTag'),
      color: c.color,
      title: t('assistant.insight.nowTitle', {
        name: c.name,
        left: f.duration(Math.ceil((current.end.getTime() - now.getTime()) / 60000)),
      }),
      sub: t('assistant.insight.nowSub', { end: f.clock(current.slot.endMin) }),
      cta: t('assistant.insight.nowCta'),
      go: () => actions.focus(current),
    });
  } else if (next && next.day === dateKey(now)) {
    const c = categoryOf(next.slot.categoryId);
    const lead = next.slot.reminderMin;
    cards.push({
      key: 'next',
      tag: t('assistant.insight.nextTag'),
      color: c.color,
      title: t('assistant.insight.nextTitle', { name: c.name, time: f.clock(next.slot.startMin) }),
      sub: t('assistant.insight.nextSub', {
        wait: f.duration(next.slot.startMin - nowMin),
        when: lead
          ? t('assistant.insight.nextBefore', { n: lead })
          : t('assistant.insight.nextAtStart'),
      }),
      cta: t('assistant.insight.nextCta'),
      go: () =>
        ui.openBlock({
          id: next.slot.id,
          categoryId: next.slot.categoryId,
          days: [...next.slot.days],
          once: next.slot.once,
          startMin: next.slot.startMin,
          endMin: next.slot.endMin,
          reminderMin: next.slot.reminderMin,
          steps: [...next.slot.steps],
          note: next.slot.note,
          stepInput: '',
        }),
    });
  }

  if (today.length) {
    const due = today.filter((o) => o.end <= now).length;
    const done = today.filter((o) => checks[`${o.day}|${o.slot.id}`] === 'done').length;
    const waiting = pendingCheckIns(today, checks, now).length;
    cards.push({
      key: 'today',
      tag: t('assistant.insight.todayTag'),
      color: paletteHex('menthe'),
      title: t('assistant.insight.todayTitle', { done, total: today.length }),
      sub:
        due > done
          ? t('assistant.insight.todayDue', { count: waiting || due - done })
          : t('assistant.insight.todayOk'),
      cta: due > done ? t('assistant.insight.todayCtaDue') : t('assistant.insight.todayCtaOk'),
      go: () => {
        if (due > done) {
          ui.setAssistant(false);
          ui.go('today');
        } else actions.send(t('assistant.tiles.reviewQ'));
      },
    });
  }

  const weak = actions
    .weekFacts(now)
    .acts.filter((a) => a.plannedMin > 0 && a.ratio < WEAK_RATIO)
    .sort((a, b) => a.ratio - b.ratio)[0];
  if (weak && Object.keys(checks).length) {
    const c = categoryOf(weak.categoryId);
    cards.push({
      key: 'weak',
      tag: t('assistant.insight.weakTag'),
      color: c.color,
      title: t('assistant.insight.weakTitle', { name: c.name }),
      sub: t('assistant.insight.weakSub', { pct: Math.round(weak.ratio * 100) }),
      cta: t('assistant.insight.weakCta'),
      go: () => actions.send(t('assistant.insight.weakQ', { name: c.name })),
    });
  }

  const freeMin = freeSlotsFrom(blocks, now, actions.rhythm, 30, nowMin).reduce(
    (m, g) => m + g.endMin - g.startMin,
    0,
  );
  if (freeMin >= 60) {
    cards.push({
      key: 'free',
      tag: t('assistant.insight.freeTag'),
      color: paletteHex('azur'),
      title: t('assistant.insight.freeTitle', { len: f.duration(freeMin) }),
      sub: t('assistant.insight.freeSub'),
      cta: t('assistant.insight.freeCta'),
      go: () => actions.send(t('assistant.reply.freeToday')),
    });
  }

  if (!blocks.length) {
    cards.push({
      key: 'start',
      tag: t('assistant.insight.startTag'),
      color: paletteHex('lavande'),
      title: t('assistant.insight.startTitle'),
      sub: t('assistant.insight.startSub'),
      cta: t('assistant.insight.startCta'),
      go: () => actions.send(t('assistant.insight.startQ')),
    });
  }
  return cards;
}
