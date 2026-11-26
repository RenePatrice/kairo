/**
 * Met en phrases (i18n) les faits calculés par @kairo/core : bilan du jour et tendances.
 * Mêmes tournures que `genReview` et `insight` dans la maquette. Aucun calcul ici.
 */
import type { DayReviewFacts, Insight, WeekReviewFacts } from '@kairo/core';
import type { TFunction } from 'i18next';
import type { Format } from './format';

const pct = (r: number) => Math.round(r * 100);

/** « A », « A et B », « A, B et C ». */
export function listNames(names: readonly string[], t: TFunction<'app'>): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')}${t('review.and')}${names[names.length - 1] ?? ''}`;
}

export interface DayReviewText {
  summary: string;
  /** Ce qui a marché. */
  a: string;
  /** À ajuster. */
  b: string;
}

export function dayReviewText(
  facts: DayReviewFacts,
  t: TFunction<'app'>,
  f: Format,
  nameOf: (categoryId: string) => string,
): DayReviewText {
  const done = facts.doneCategoryIds.map(nameOf);
  const a = facts.done
    ? t(facts.goalReached ? 'review.keptGoal' : 'review.kept', { names: listNames(done, t) })
    : t('review.off');
  const b =
    facts.advice === 'catch_up'
      ? t('review.catchUp', {
          names: listNames(facts.missedCategoryIds.map(nameOf), t),
          time: f.clock(facts.firstMissedStart ?? 0),
        })
      : t(facts.advice === 'low_energy' ? 'review.lowEnergy' : 'review.keep');
  const levels = t('review.levels', { returnObjects: true }) as string[];
  let summary = t('review.summary', {
    pct: pct(facts.ratio),
    done: facts.done,
    due: facts.due,
    hours: f.hours(facts.doneMin),
  });
  if (facts.average7 !== null) {
    summary += t('review.vsAverage', {
      side: t(facts.ratio >= facts.average7 ? 'review.above' : 'review.below'),
      avg: pct(facts.average7),
    });
  }
  summary += '.';
  if (facts.energy) {
    summary += t('review.energy', {
      level: levels[Math.min(2, Math.max(0, Math.round(facts.energy) - 1))] ?? '',
    });
  }
  if (facts.goalReached === true) summary += t('review.goalOk');
  if (facts.goalReached === false) summary += t('review.goalMiss');
  return { summary, a, b };
}

/** « Salle est ton point fort. … Meilleur jour : mardi. Plus fragile : vendredi. … » */
export function insightText(
  insight: Insight | null,
  t: TFunction<'app'>,
  f: Format,
  nameOf: (categoryId: string) => string,
): string {
  if (!insight) return t('insight.none');
  let out = '';
  if (insight.strongId) out += t('insight.strong', { name: nameOf(insight.strongId) });
  if (insight.weakId) out += t('insight.weak', { name: nameOf(insight.weakId) });
  out += t('insight.days', {
    best: f.dayInSentence(insight.bestDay),
    worst: f.dayInSentence(insight.worstDay),
  });
  if (insight.bestMoment) {
    out += t('insight.energy', { moment: t(`insight.moments.${insight.bestMoment}`) });
  }
  return out;
}

export interface WeekReviewText extends DayReviewText {
  /** Cap proposé pour la semaine suivante. */
  next: string;
}

/** Bilan de la semaine (maquette : `genReview('W')`). */
export function weekReviewText(
  facts: WeekReviewFacts,
  t: TFunction<'app'>,
  f: Format,
  nameOf: (categoryId: string) => string,
): WeekReviewText {
  const a = facts.strong
    ? t(facts.goalReached ? 'review.weekStrongGoal' : 'review.weekStrong', {
        name: nameOf(facts.strong.categoryId),
        hours: f.hours(facts.strong.doneMin),
      })
    : t('review.weekRestart');
  const b =
    facts.advice === 'weak_activity' && facts.weak
      ? t('review.weekWeak', { name: nameOf(facts.weak.categoryId), pct: pct(facts.weak.ratio) })
      : facts.advice === 'fragile_day' && facts.worstDay !== null
        ? t('review.weekFragile', { day: f.dayInSentence(facts.worstDay) })
        : t('review.weekSolid');
  const next = facts.weak
    ? t('review.nextWeak', { name: nameOf(facts.weak.categoryId) })
    : t('review.nextRaise');
  let summary = t('review.weekSummary', { pct: pct(facts.ratio), hours: f.hours(facts.totalMin) });
  if (facts.previousRatio !== null) {
    const diff = Math.round((facts.ratio - facts.previousRatio) * 100);
    summary += t('review.weekVsPrevious', { sign: diff >= 0 ? '+' : '', n: diff });
  }
  summary += '.';
  if (facts.bestDay !== null)
    summary += t('review.weekBest', { day: f.dayInSentence(facts.bestDay) });
  if (facts.energy) {
    summary += t('review.weekEnergy', { level: t(`review.weekEnergyLevels.${facts.energy}`) });
  }
  if (facts.goalReached === true) summary += t('review.weekGoalOk');
  if (facts.goalReached === false) summary += t('review.weekGoalMiss');
  return { summary, a, b, next };
}

/** Libellé d'un objectif sans texte libre (« Valider 3 créneaux », « 10 h utiles cette semaine »). */
export function goalText(
  goal: { kind: string; target: number; text: string; categoryId?: string | null },
  t: TFunction<'app'>,
  nameOf: (categoryId: string) => string,
  scope: 'D' | 'W' = 'D',
): string {
  if (goal.text) return goal.text;
  switch (goal.kind) {
    case 'blocks':
      return t('goal.textBlocks', { count: goal.target });
    case 'hours':
      return t(scope === 'W' ? 'goal.textWeekHours' : 'goal.textHours', { n: goal.target });
    case 'rate':
      return t('goal.textRate', { n: goal.target });
    case 'act':
      return t('goal.textAct', { n: goal.target, name: nameOf(goal.categoryId ?? '') });
    default:
      return t('goal.textFree');
  }
}
