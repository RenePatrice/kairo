/**
 * Bilans du jour et de la semaine, comme `genReview` dans la maquette. Ce module calcule les faits
 * (taux, heures, humeur, points forts, conseil, prochain cap) ; l'interface les met en phrases
 * (i18n) et l'IA peut les reformuler. Aucune phrase n'est écrite ici.
 */
import { checkKey, dayStats, type HistoryContext } from './checkin';
import { addDays, dateKey, isoWeekday, startOfDay, startOfWeek } from './dates';
import { occursOn } from './schedule';
import { type CategorySlot, type DayGoal, type EnergyMap, type WeekGoal } from './stats';
import { durationMin } from './time';

/** Humeur de 1 (difficile) à 5 (top), tirée du taux et de l'énergie moyenne. */
export function moodFrom(ratio: number, energy: number): number {
  let m = ratio >= 0.9 ? 5 : ratio >= 0.7 ? 4 : ratio >= 0.5 ? 3 : ratio >= 0.25 ? 2 : 1;
  if (energy && energy < 1.6 && m > 2) m--;
  if (energy && energy > 2.5 && m < 5 && ratio >= 0.6) m++;
  return m;
}

const uniq = <T>(list: readonly T[]): T[] => [...new Set(list)];

export interface ReviewInput {
  slots: readonly CategorySlot[];
  history: HistoryContext;
  energy: EnergyMap;
  now: Date;
}

export interface DayReviewFacts {
  mood: number;
  ratio: number;
  done: number;
  due: number;
  doneMin: number;
  /** Moyenne des 7 jours précédents, `null` sans historique. */
  average7: number | null;
  /** Énergie moyenne des créneaux faits (1..3), 0 sans note. */
  energy: number;
  /** `null` sans objectif chiffré. */
  goalReached: boolean | null;
  /** Activités tenues (3 au plus) et manquées (2 au plus), dans l'ordre de la journée. */
  doneCategoryIds: string[];
  missedCategoryIds: string[];
  /** Heure du premier créneau raté (« Le créneau de 18:00 a sauté »). */
  firstMissedStart: number | null;
  advice: 'catch_up' | 'low_energy' | 'keep';
}

export function dayReview(date: Date, input: ReviewInput, goal?: DayGoal): DayReviewFacts {
  const { slots, history, energy, now } = input;
  const k = dateKey(date);
  const isToday = k === dateKey(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const items = slots
    .filter((s) => occursOn(s, date))
    .filter((s) => !isToday || s.startMin + durationMin(s.startMin, s.endMin) <= nowMin)
    .sort((a, b) => a.startMin - b.startMin);
  const done = items.filter((s) => history.checks[checkKey(k, s.id)] === 'done');
  const missed = items.filter((s) => history.checks[checkKey(k, s.id)] !== 'done');
  const doneMin = done.reduce((m, s) => m + durationMin(s.startMin, s.endMin), 0);
  const ratio = items.length ? done.length / items.length : 0;
  const notes = done.map((s) => energy[checkKey(k, s.id)]).filter((e) => e !== undefined);
  const avgEnergy = notes.length ? notes.reduce((m, e) => m + e, 0) / notes.length : 0;

  let prev = 0;
  let days = 0;
  for (let i = 1; i <= 7; i++) {
    const st = dayStats(slots, addDays(date, -i), history);
    if (st.ratio !== null) {
      prev += st.ratio;
      days++;
    }
  }

  let goalReached: boolean | null = null;
  if (goal && goal.kind !== 'free') {
    goalReached = goal.kind === 'blocks' ? done.length >= goal.target : doneMin / 60 >= goal.target;
  }
  const advice = missed.length ? 'catch_up' : avgEnergy && avgEnergy < 1.8 ? 'low_energy' : 'keep';
  return {
    mood: items.length ? moodFrom(ratio, avgEnergy) : 3,
    ratio,
    done: done.length,
    due: items.length,
    doneMin,
    average7: days ? prev / days : null,
    energy: avgEnergy,
    goalReached,
    doneCategoryIds: uniq(done.map((s) => s.categoryId)).slice(0, 3),
    missedCategoryIds: uniq(missed.map((s) => s.categoryId)).slice(0, 2),
    firstMissedStart: missed[0]?.startMin ?? null,
    advice,
  };
}

export interface WeekReviewFacts {
  mood: number;
  ratio: number;
  totalMin: number;
  /** Régularité de la semaine précédente, `null` sans donnée. */
  previousRatio: number | null;
  bestDay: number | null;
  worstDay: number | null;
  worstRatio: number | null;
  strong: { categoryId: string; doneMin: number } | null;
  weak: { categoryId: string; ratio: number } | null;
  energy: 'high' | 'low' | 'stable' | null;
  goalReached: boolean | null;
  advice: 'weak_activity' | 'fragile_day' | 'solid';
  /** Cap proposé pour la semaine suivante. */
  nextGoal: WeekGoal & { focus: 'activity' | 'raise' };
}

export const WEAK_WEEK_RATIO = 0.75;

export function weekReview(date: Date, input: ReviewInput, goal?: WeekGoal): WeekReviewFacts {
  const { slots, history, energy, now } = input;
  const ws = startOfWeek(date);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const planned = new Map<string, number>();
  const doneBy = new Map<string, number>();
  let due = 0;
  let dn = 0;
  let total = 0;
  let bestDay: number | null = null;
  let bestR = -1;
  let worstDay: number | null = null;
  let worstR = 2;
  let enSum = 0;
  let enN = 0;
  for (let d = 0; d < 7; d++) {
    const dt = addDays(ws, d);
    if (dt > now) break;
    const isToday = dateKey(dt) === dateKey(now);
    const st = dayStats(slots, dt, history, isToday ? nowMin : undefined);
    due += st.due;
    dn += st.done;
    if (st.ratio !== null) {
      if (st.ratio > bestR) [bestR, bestDay] = [st.ratio, d];
      if (st.ratio < worstR) [worstR, worstDay] = [st.ratio, d];
    }
    const k = dateKey(dt);
    for (const s of slots) {
      if (!occursOn(s, dt)) continue;
      const m = durationMin(s.startMin, s.endMin);
      planned.set(s.categoryId, (planned.get(s.categoryId) ?? 0) + m);
      if (history.checks[checkKey(k, s.id)] === 'done') {
        doneBy.set(s.categoryId, (doneBy.get(s.categoryId) ?? 0) + m);
        total += m;
      }
      const e = energy[checkKey(k, s.id)];
      if (e !== undefined) {
        enSum += e;
        enN++;
      }
    }
  }
  const ratio = due ? dn / due : 0;

  let pDue = 0;
  let pDone = 0;
  for (let d = 0; d < 7; d++) {
    const st = dayStats(slots, addDays(ws, d - 7), history);
    pDue += st.due;
    pDone += st.done;
  }

  const ranked = [...planned.entries()]
    .map(([id, plan]) => ({ id, r: (doneBy.get(id) ?? 0) / plan, m: doneBy.get(id) ?? 0 }))
    .sort((a, b) => b.r - a.r);
  const strong = ranked[0];
  const weak = ranked.length > 1 ? ranked[ranked.length - 1] : undefined;
  const weakNow = weak && weak.r < WEAK_WEEK_RATIO ? weak : undefined;

  let goalReached: boolean | null = null;
  if (goal) {
    goalReached =
      goal.kind === 'rate'
        ? ratio * 100 >= goal.target
        : (goal.kind === 'act' ? (doneBy.get(goal.categoryId ?? '') ?? 0) : total) / 60 >=
          goal.target;
  }
  const avgEnergy = enN ? enSum / enN : 0;
  const nextGoal: WeekReviewFacts['nextGoal'] = weakNow
    ? {
        kind: 'act',
        categoryId: weakNow.id,
        target: Math.max(1, Math.round(((planned.get(weakNow.id) ?? 60) / 60) * 0.8)),
        focus: 'activity',
      }
    : {
        kind: 'rate',
        target: Math.min(100, Math.max(60, Math.round(ratio * 20) * 5 + 5)),
        focus: 'raise',
      };
  return {
    mood: due ? moodFrom(ratio, avgEnergy) : 3,
    ratio,
    totalMin: total,
    previousRatio: pDue ? pDone / pDue : null,
    bestDay,
    worstDay,
    worstRatio: worstDay === null ? null : worstR,
    strong: strong ? { categoryId: strong.id, doneMin: strong.m } : null,
    weak: weakNow ? { categoryId: weakNow.id, ratio: weakNow.r } : null,
    energy: enN ? (avgEnergy > 2.3 ? 'high' : avgEnergy < 1.7 ? 'low' : 'stable') : null,
    goalReached,
    advice: weakNow ? 'weak_activity' : worstDay !== null && worstR < 0.7 ? 'fragile_day' : 'solid',
    nextGoal,
  };
}

export interface AutoReviewPlan {
  /** Jours (clé AAAA-MM-JJ) dont le bilan peut être rédigé automatiquement. */
  days: string[];
  /** Semaines (clé W2026-48) à rédiger, avec la date d'un de leurs jours. */
  weeks: Array<{ key: string; date: Date }>;
}

/**
 * Bilans automatiques de la maquette : chaque jour passé (ou aujourd'hui après 23 h) avec des
 * créneaux et des check-ins ; la semaine en cours le dimanche après 21 h, la précédente si oubliée.
 */
export function autoReviewsDue(
  input: Pick<ReviewInput, 'slots' | 'history' | 'now'>,
  existing: ReadonlySet<string>,
  weekKeyOf: (d: Date) => string,
): AutoReviewPlan {
  const { slots, history, now } = input;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const checkedDays = new Set(Object.keys(history.checks).map((k) => k.split('|')[0]));
  const days: string[] = [];
  for (let i = 0; i <= 7; i++) {
    const d = addDays(startOfDay(now), -i);
    const k = dateKey(d);
    if (i === 0 && nowMin < 1380) continue;
    if (existing.has(`D${k}`) || !slots.some((s) => occursOn(s, d))) continue;
    if (i > 0 && !checkedDays.has(k)) continue;
    days.push(k);
  }
  const weeks: AutoReviewPlan['weeks'] = [];
  for (let w = 0; w <= 1; w++) {
    const dw = addDays(startOfDay(now), -7 * w);
    const key = weekKeyOf(dw);
    if (w === 0 && !(isoWeekday(now) === 6 && nowMin >= 1260)) continue;
    if (existing.has(key)) continue;
    const ws = startOfWeek(dw);
    const any = Array.from({ length: 7 }, (_, j) => dateKey(addDays(ws, j))).some((k) =>
      checkedDays.has(k),
    );
    if (any) weeks.push({ key, date: dw });
  }
  return { days, weeks };
}
