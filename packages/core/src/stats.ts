/**
 * Statistiques de l'onglet Bilans et de l'assistant, reprises de la maquette : régularité sur
 * 7 jours et tendance, barres des 8 dernières semaines, carte de chaleur de 5 semaines, heures par
 * activité, énergie par moment de la journée, point fort / point fragile, objectifs.
 * Tout est factuel : les phrases sont rédigées par l'interface (i18n) ou par l'IA.
 */
import { checkKey, dayStats, type CheckMap, type DayStats, type HistoryContext } from './checkin';
import { addDays, dateKey, isoWeekday, startOfDay, startOfWeek, type DateKey } from './dates';
import { occursOn, type Slot } from './schedule';
import { durationMin } from './time';
import { weekDates } from './week';

/** Créneau rattaché à une activité. */
export interface CategorySlot extends Slot {
  categoryId: string;
}

export interface StatsCategory {
  id: string;
  /** Objectif d'heures par semaine ; 0 = libre. */
  weeklyGoalH: number;
}

/** Note d'énergie après « Fait » : 1 vidé, 2 correct, 3 en feu. */
export type EnergyLevel = 1 | 2 | 3;
export type EnergyMap = Readonly<Record<string, EnergyLevel>>;

export const HISTORY_DAYS = 56;

export interface DailyEntry {
  date: Date;
  stats: DayStats;
}

/** Les `days` derniers jours, du plus récent (aujourd'hui, compté jusqu'à maintenant) au plus ancien. */
export function dailyHistory(
  slots: readonly Slot[],
  now: Date,
  ctx: HistoryContext,
  days = HISTORY_DAYS,
): DailyEntry[] {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(startOfDay(now), -i);
    return { date, stats: dayStats(slots, date, ctx, i === 0 ? nowMin : undefined) };
  });
}

/** Taux de réalisation entre les jours `from` (inclus) et `to` (exclu) de l'historique. */
export function rateBetween(daily: readonly DailyEntry[], from: number, to: number): number | null {
  let due = 0;
  let done = 0;
  for (const e of daily.slice(Math.max(0, from), Math.max(0, to))) {
    due += e.stats.due;
    done += e.stats.done;
  }
  return due ? done / due : null;
}

export interface Momentum {
  /** Régularité des 7 derniers jours (0..1), `null` sans créneau dû. */
  current: number | null;
  previous: number | null;
  /** Écart en points avec les 7 jours d'avant. */
  trend: number | null;
}

export function momentum(daily: readonly DailyEntry[]): Momentum {
  const current = rateBetween(daily, 0, 7);
  const previous = rateBetween(daily, 7, 14);
  const trend =
    current !== null && previous !== null ? Math.round((current - previous) * 100) : null;
  return { current, previous, trend };
}

/** Régularité des 8 dernières semaines (lundi → dimanche), de la plus ancienne à la semaine en cours. */
export function weekBars(daily: readonly DailyEntry[], now: Date): Array<number | null> {
  const today = isoWeekday(now);
  const bars: Array<number | null> = [];
  for (let wk = 7; wk >= 0; wk--) {
    const from = wk === 0 ? 0 : today + (wk - 1) * 7 + 1;
    const to = wk === 0 ? today + 1 : today + wk * 7 + 1;
    bars.push(rateBetween(daily, from, Math.min(daily.length, to)));
  }
  return bars;
}

export interface HeatCell {
  day: DateKey;
  future: boolean;
  today: boolean;
  ratio: number | null;
}

/** Carte de chaleur : 5 semaines complètes, la dernière contient aujourd'hui. */
export function heatmap(slots: readonly Slot[], now: Date, ctx: HistoryContext): HeatCell[] {
  const midnight = startOfDay(now);
  const start = addDays(midnight, -isoWeekday(now) - 28);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return Array.from({ length: 35 }, (_, i) => {
    const date = addDays(start, i);
    const day = dateKey(date);
    const today = day === dateKey(now);
    const future = date > midnight;
    const ratio = future ? null : dayStats(slots, date, ctx, today ? nowMin : undefined).ratio;
    return { day, future, today, ratio };
  });
}

export interface DayTotals {
  minutes: number;
  count: number;
}

/** Minutes et créneaux validés un jour (toutes activités, ou une seule). */
export function doneOn(
  slots: readonly CategorySlot[],
  date: Date,
  checks: CheckMap,
  categoryId?: string,
): DayTotals {
  const k = dateKey(date);
  let minutes = 0;
  let count = 0;
  for (const s of slots) {
    if (!occursOn(s, date) || (categoryId && s.categoryId !== categoryId)) continue;
    if (checks[checkKey(k, s.id)] === 'done') {
      minutes += durationMin(s.startMin, s.endMin);
      count++;
    }
  }
  return { minutes, count };
}

/** Minutes et créneaux prévus un jour. */
export function plannedOn(
  slots: readonly CategorySlot[],
  date: Date,
  categoryId?: string,
): DayTotals {
  let minutes = 0;
  let count = 0;
  for (const s of slots) {
    if (!occursOn(s, date) || (categoryId && s.categoryId !== categoryId)) continue;
    minutes += durationMin(s.startMin, s.endMin);
    count++;
  }
  return { minutes, count };
}

export interface ActivityWeek {
  categoryId: string;
  plannedMin: number;
  doneMin: number;
  goalMin: number;
  /** Rapport à l'objectif (ou au prévu sans objectif) ; peut dépasser 1. */
  ratio: number;
}

/** Heures prévues et réalisées par activité sur la semaine qui commence à `weekStart`. */
export function activityWeek(
  slots: readonly CategorySlot[],
  categories: readonly StatsCategory[],
  weekStart: Date,
  checks: CheckMap,
): ActivityWeek[] {
  return categories.map((c) => {
    let plannedMin = 0;
    let doneMin = 0;
    for (const d of weekDates(weekStart)) {
      plannedMin += plannedOn(slots, d, c.id).minutes;
      doneMin += doneOn(slots, d, checks, c.id).minutes;
    }
    const goalMin = c.weeklyGoalH * 60;
    const ratio = goalMin ? doneMin / goalMin : plannedMin ? doneMin / plannedMin : 0;
    return { categoryId: c.id, plannedMin, doneMin, goalMin, ratio };
  });
}

export type DayMoment = 'morning' | 'afternoon' | 'evening';
export const DAY_MOMENTS: readonly DayMoment[] = ['morning', 'afternoon', 'evening'];

export function momentOf(startMin: number): DayMoment {
  return startMin < 720 ? 'morning' : startMin < 1080 ? 'afternoon' : 'evening';
}

/** Énergie moyenne (1..3) le matin, l'après-midi et le soir ; 0 sans note. */
export function energyByMoment(
  energy: EnergyMap,
  slots: readonly Slot[],
): Record<DayMoment, number> {
  const sum = { morning: [0, 0], afternoon: [0, 0], evening: [0, 0] };
  for (const [key, level] of Object.entries(energy)) {
    const id = key.split('|')[1];
    const slot = slots.find((s) => s.id === id);
    if (!slot) continue;
    const bucket = sum[momentOf(slot.startMin)];
    bucket[0] = (bucket[0] ?? 0) + level;
    bucket[1] = (bucket[1] ?? 0) + 1;
  }
  const avg = ([total = 0, n = 0]: number[]) => (n ? total / n : 0);
  return { morning: avg(sum.morning), afternoon: avg(sum.afternoon), evening: avg(sum.evening) };
}

/** Taux moyen par jour de la semaine (lundi = 0) sur l'historique ; `null` sans donnée. */
export function weekdayRates(daily: readonly DailyEntry[]): Array<number | null> {
  return Array.from({ length: 7 }, (_, d) => {
    let due = 0;
    let done = 0;
    for (const e of daily) {
      if (isoWeekday(e.date) !== d) continue;
      due += e.stats.due;
      done += e.stats.done;
    }
    return due ? done / due : null;
  });
}

export interface Insight {
  strongId: string | null;
  /** Activité qui décroche (moins de 70 % de son objectif). */
  weakId: string | null;
  bestDay: number;
  worstDay: number;
  bestMoment: DayMoment | null;
}

export const WEAK_RATIO = 0.7;

/** « Salle est ton point fort. Lecture décroche… Meilleur jour : mardi. Plus fragile : vendredi. » */
export function weekInsight(
  activities: readonly ActivityWeek[],
  daily: readonly DailyEntry[],
  energy: Record<DayMoment, number>,
  /** Au moins un check-in enregistré (comme la maquette : sinon pas de tendance). */
  hasHistory: boolean,
): Insight | null {
  if (!hasHistory || !activities.length) return null;
  const sorted = activities.filter((a) => a.plannedMin > 0).sort((a, b) => b.ratio - a.ratio);
  const strong = sorted[0];
  const weak = sorted.length > 1 ? sorted[sorted.length - 1] : undefined;
  const rates = weekdayRates(daily);
  const best = rates.reduce<number>((bi, r, i) => ((r ?? -1) > (rates[bi] ?? -1) ? i : bi), 0);
  const worst = rates.reduce<number>((wi, r, i) => ((r ?? 2) < (rates[wi] ?? 2) ? i : wi), 0);
  const topMoment = DAY_MOMENTS.reduce((m, k) => (energy[k] > energy[m] ? k : m), 'morning');
  return {
    strongId: strong?.categoryId ?? null,
    weakId: weak && weak.ratio < WEAK_RATIO ? weak.categoryId : null,
    bestDay: best,
    worstDay: worst,
    bestMoment: energy[topMoment] ? topMoment : null,
  };
}

/** Objectif du jour : nombre de créneaux, heures utiles, ou simple intention. */
export interface DayGoal {
  kind: 'blocks' | 'hours' | 'free';
  target: number;
  text?: string;
}

/** Objectif de la semaine : heures utiles, régularité (%), ou heures d'une activité. */
export interface WeekGoal {
  kind: 'hours' | 'rate' | 'act';
  target: number;
  categoryId?: string;
  text?: string;
}

/** Progression de l'objectif du jour (1 = atteint) ; `null` pour une simple intention. */
export function dayGoalProgress(goal: DayGoal | undefined, done: DayTotals): number | null {
  if (!goal || goal.kind === 'free') return null;
  return goal.kind === 'blocks'
    ? done.count / Math.max(1, goal.target)
    : done.minutes / 60 / Math.max(0.5, goal.target);
}

export type WeekGoalStatus = 'reached' | 'ahead' | 'on_track' | 'behind' | 'above' | 'below';

export interface WeekGoalProgress {
  /** Régularité en % (objectif `rate`) ou heures cumulées (autres objectifs). */
  value: number;
  status: WeekGoalStatus;
  /** Valeur cumulée jour par jour, jusqu'à aujourd'hui, pour la courbe. */
  points: Array<{ day: number; value: number }>;
}

/** Où en est l'objectif de la semaine (courbe et pastille « EN AVANCE », « EN RETARD »…). */
export function weekGoalProgress(
  goal: WeekGoal,
  slots: readonly CategorySlot[],
  weekStart: Date,
  now: Date,
  ctx: HistoryContext,
): WeekGoalProgress {
  const today = Math.min(
    6,
    Math.max(
      0,
      Math.round((startOfDay(now).getTime() - startOfDay(weekStart).getTime()) / 86_400_000),
    ),
  );
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const points: Array<{ day: number; value: number }> = [];
  if (goal.kind === 'rate') {
    let due = 0;
    let done = 0;
    for (let i = 0; i <= today; i++) {
      const st = dayStats(slots, addDays(weekStart, i), ctx, i === today ? nowMin : undefined);
      due += st.due;
      done += st.done;
      if (due) points.push({ day: i, value: (done / due) * 100 });
    }
    const value = due ? (done / due) * 100 : 0;
    return { value, status: value >= goal.target ? 'above' : 'below', points };
  }
  const only = goal.kind === 'act' ? goal.categoryId : undefined;
  let hours = 0;
  for (let i = 0; i <= today; i++) {
    hours += doneOn(slots, addDays(weekStart, i), ctx.checks, only).minutes / 60;
    points.push({ day: i, value: hours });
  }
  const pace = (goal.target * (today + 1)) / 7;
  const rt = hours / Math.max(0.1, pace);
  const status: WeekGoalStatus =
    hours >= goal.target ? 'reached' : rt >= 1 ? 'ahead' : rt >= 0.85 ? 'on_track' : 'behind';
  return { value: hours, status, points };
}

export interface WeekEntry {
  weekStart: Date;
  /** Minutes validées par activité. */
  perCategory: Record<string, number>;
  totalMin: number;
  /** Régularité (0..1), `null` sans créneau dû. */
  rate: number | null;
  /** `null` sans objectif pour cette semaine. */
  goalReached: boolean | null;
  current: boolean;
}

/**
 * Les `weeks` dernières semaines (lundi → dimanche), de la plus ancienne à la semaine en cours,
 * comptée jusqu'à maintenant (graphique « Évolution · 8 semaines » de la maquette).
 */
export function weekHistory(
  slots: readonly CategorySlot[],
  now: Date,
  ctx: HistoryContext,
  goalOf: (weekStart: Date) => WeekGoal | undefined,
  weeks = 8,
): WeekEntry[] {
  const thisWeek = startOfWeek(now);
  const today = isoWeekday(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const out: WeekEntry[] = [];
  for (let k = weeks - 1; k >= 0; k--) {
    const weekStart = addDays(thisWeek, -7 * k);
    const perCategory: Record<string, number> = {};
    let totalMin = 0;
    let due = 0;
    let done = 0;
    for (let d = 0; d < 7; d++) {
      if (k === 0 && d > today) break;
      const date = addDays(weekStart, d);
      const st = dayStats(slots, date, ctx, k === 0 && d === today ? nowMin : undefined);
      due += st.due;
      done += st.done;
      const key = dateKey(date);
      for (const s of slots) {
        if (!occursOn(s, date) || ctx.checks[checkKey(key, s.id)] !== 'done') continue;
        const m = durationMin(s.startMin, s.endMin);
        perCategory[s.categoryId] = (perCategory[s.categoryId] ?? 0) + m;
        totalMin += m;
      }
    }
    const goal = goalOf(weekStart);
    let goalReached: boolean | null = null;
    if (goal) {
      goalReached =
        goal.kind === 'rate'
          ? due > 0 && (done / due) * 100 >= goal.target
          : (goal.kind === 'act' ? (perCategory[goal.categoryId ?? ''] ?? 0) : totalMin) / 60 >=
            goal.target;
    }
    out.push({
      weekStart,
      perCategory,
      totalMin,
      rate: due ? done / due : null,
      goalReached,
      current: k === 0,
    });
  }
  return out;
}
