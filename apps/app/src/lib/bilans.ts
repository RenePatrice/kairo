/**
 * Données et actions de l'onglet Bilans (maquette : « Historique & stats », « Objectifs &
 * bilans »). Tous les chiffres viennent de @kairo/core ; ici on ne fait que les assembler.
 */
import {
  activityWeek,
  addDays,
  dailyHistory,
  dateKey,
  demoExtras,
  demoHistory,
  energyByMoment,
  firstCheckDay,
  heatmap,
  momentum,
  plannedOn,
  startOfDay,
  startOfWeek,
  streak,
  trophyState,
  weekHistory,
  weekInsight,
  weekKey,
  type DayGoal,
  type WeekGoal,
} from '@kairo/core';
import {
  addChecks,
  addEnergyLevels,
  addGoals,
  addReviews,
  readChecks,
  useDb,
  useEnergy,
  useGoals,
  useReviews,
  type Goal,
  type Review,
} from '@kairo/db';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useUi } from '../store';
import { useAppData } from './data';
import { useFormat } from './format';
import { insightText } from './reviewText';

const EMPTY_GOALS: Readonly<Record<string, Goal>> = {};
const EMPTY_REVIEWS: Readonly<Record<string, Review>> = {};

export function toDayGoal(g: Goal | undefined): DayGoal | undefined {
  return g?.scope === 'D' ? { kind: g.kind, target: g.target, text: g.text } : undefined;
}

export function toWeekGoal(g: Goal | undefined): WeekGoal | undefined {
  return g?.scope === 'W'
    ? { kind: g.kind, target: g.target, categoryId: g.categoryId ?? undefined, text: g.text }
    : undefined;
}

/** Tout ce que montre l'onglet Bilans, recalculé quand les données changent. */
export function useBilans(now: Date) {
  const { t } = useTranslation('app');
  const f = useFormat();
  const { settings, categories, blocks, checks, restDays, categoryOf } = useAppData();
  const liveEnergy = useEnergy();
  const goals = useGoals() ?? EMPTY_GOALS;
  const reviews = useReviews() ?? EMPTY_REVIEWS;
  const energy = useMemo(() => liveEnergy ?? {}, [liveEnergy]);

  return useMemo(() => {
    const history = { checks, restDays, since: firstCheckDay(checks) };
    const daily = dailyHistory(blocks, now, history);
    const moments = energyByMoment(energy, blocks);
    const acts = activityWeek(blocks, categories, startOfWeek(now), checks);
    const hasHistory = Object.keys(checks).length > 0;
    const series = streak(blocks, now, history);
    return {
      history,
      daily,
      momentum: momentum(daily),
      series,
      heat: heatmap(blocks, now, history),
      moments,
      acts,
      hasHistory,
      insight: insightText(
        weekInsight(acts, daily, moments, hasHistory),
        t,
        f,
        (id) => categoryOf(id).name,
      ),
      weeks: weekHistory(blocks, now, history, (ws) => toWeekGoal(goals[weekKey(ws)])),
      trophies: trophyState({
        slots: blocks,
        history,
        now,
        weekGoals: Object.fromEntries(
          Object.entries(goals).flatMap(([k, g]) => {
            const wg = toWeekGoal(g);
            return wg ? [[k, wg]] : [];
          }),
        ),
        weekKeyOf: weekKey,
        focusCount: settings.focusCount,
        reviewCount: Object.keys(reviews).length,
      }),
      goals,
      reviews,
    };
  }, [
    blocks,
    categories,
    checks,
    restDays,
    energy,
    goals,
    reviews,
    settings.focusCount,
    now,
    t,
    f,
    categoryOf,
  ]);
}

/** Ouverture des fiches Objectif et Bilan, et données de démo. */
export function useBilanActions() {
  const { t } = useTranslation('app');
  const db = useDb();
  const { blocks } = useAppData();
  const goals = useGoals() ?? EMPTY_GOALS;
  const reviews = useReviews() ?? EMPTY_REVIEWS;
  const openGoal = useUi((s) => s.openGoal);
  const openReview = useUi((s) => s.openReview);
  const flash = useUi((s) => s.flash);
  const go = useUi((s) => s.go);
  const setStatTab = useUi((s) => s.setStatTab);

  const goalFor = useCallback(
    (scope: 'D' | 'W', date: Date) => {
      const key = scope === 'D' ? `D${dateKey(date)}` : weekKey(date);
      const ws = startOfWeek(date);
      let weekMin = 0;
      for (let i = 0; i < 7; i++) weekMin += plannedOn(blocks, addDays(ws, i)).minutes;
      const day = plannedOn(blocks, date);
      const hoursDefault = Math.max(1, Math.round(weekMin / 60));
      const blocksDefault = Math.max(1, day.count);
      const g = goals[key];
      openGoal({
        scope,
        key,
        kind: g?.kind ?? (scope === 'D' ? 'blocks' : 'hours'),
        target: g?.target ?? (scope === 'D' ? blocksDefault : hoursDefault),
        text: g?.text ?? '',
        categoryId: (g?.scope === 'W' ? g.categoryId : null) ?? null,
        hoursDefault,
        blocksDefault,
        plannedMin: day.minutes,
      });
    },
    [blocks, goals, openGoal],
  );

  const reviewFor = useCallback(
    (scope: 'D' | 'W', date: Date) => {
      const key = scope === 'D' ? `D${dateKey(date)}` : weekKey(date);
      const r = reviews[key];
      openReview({
        scope,
        key,
        date: startOfDay(date).getTime(),
        mood: r?.mood ?? 0,
        a: r?.a ?? '',
        b: r?.b ?? '',
        next: '',
        summary: r?.summary ?? '',
        ai: r?.ai ?? false,
        nextGoal: null,
      });
    },
    [reviews, openReview],
  );

  /** « Voir avec 8 semaines de démo » : check-ins, énergie, objectifs et humeurs simulés. */
  const fillDemo = useCallback(async () => {
    if (!blocks.length) return flash(t('settings.needBlocks'));
    const now = new Date();
    await addChecks(db, demoHistory(blocks, now));
    const extras = demoExtras(blocks, now, await readChecks(db));
    await addEnergyLevels(db, extras.energy);
    await addGoals(db, [
      ...extras.dayGoals.map((g) => ({
        id: g.key,
        scope: 'D' as const,
        kind: 'blocks' as const,
        target: g.target,
        text: '',
      })),
      ...extras.weekGoals.map((g) => ({
        id: g.key,
        scope: 'W' as const,
        kind: 'hours' as const,
        target: g.target,
        categoryId: null,
        text: '',
      })),
    ]);
    await addReviews(
      db,
      extras.reviews.map((r) => ({
        id: r.key,
        mood: r.mood,
        a: '',
        b: '',
        summary: '',
        ai: false,
      })),
    );
    setStatTab('week');
    go('stats');
    flash(t('stats.demoDone'));
  }, [blocks, db, flash, go, setStatTab, t]);

  return { goalFor, reviewFor, fillDemo };
}
