/**
 * Met en phrases (i18n) les faits calculés par @kairo/core : bilan du jour et tendances.
 * Mêmes tournures que `genReview` et `insight` dans la maquette. Aucun calcul ici.
 */
import type { DayReviewFacts, Insight } from '@kairo/core';
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
