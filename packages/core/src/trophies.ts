/**
 * Trophées de l'onglet Bilans, conditions reprises de la maquette (`trophyState`).
 */
import { checkKey, dayStats, type HistoryContext } from './checkin';
import { addDays, dateKey, startOfDay, startOfWeek } from './dates';
import { occursOn, type Slot } from './schedule';
import { STREAK_THRESHOLD } from './checkin';
import type { CategorySlot, WeekGoal } from './stats';
import { durationMin } from './time';

export const TROPHY_IDS = [
  'first',
  'streak3',
  'streak7',
  'streak30',
  'perfectDay',
  'goalWeek',
  'h10',
  'h50',
  'h100',
  'focus5',
  'reviewer',
  'early',
  'night',
  'rest',
] as const;
export type TrophyId = (typeof TROPHY_IDS)[number];

export interface TrophyInput {
  slots: readonly CategorySlot[];
  history: HistoryContext;
  now: Date;
  /** Objectifs de semaine, par clé de semaine (« W2026-48 »). */
  weekGoals: Readonly<Record<string, WeekGoal>>;
  weekKeyOf: (d: Date) => string;
  focusCount: number;
  reviewCount: number;
}

const TROPHY_LOOKBACK_DAYS = 120;

function bestRunAndPerfect(
  slots: readonly Slot[],
  now: Date,
  history: HistoryContext,
): { best: number; perfect: boolean } {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  let best = 0;
  let run = 0;
  let perfect = false;
  for (let i = TROPHY_LOOKBACK_DAYS; i >= 0; i--) {
    const st = dayStats(slots, addDays(startOfDay(now), -i), history, i === 0 ? nowMin : undefined);
    if (st.ratio === null) continue;
    if (st.ratio >= STREAK_THRESHOLD) {
      run++;
      best = Math.max(best, run);
    } else if (i > 0) run = 0;
    if (st.ratio === 1 && st.due >= 2) perfect = true;
  }
  return { best, perfect };
}

/** Un objectif de semaine atteint parmi les 12 semaines passées. */
function weekGoalReached(input: TrophyInput): boolean {
  const { slots, history, now, weekGoals, weekKeyOf } = input;
  for (let w = 1; w <= 12; w++) {
    const ws = addDays(startOfWeek(now), -7 * w);
    const goal = weekGoals[weekKeyOf(ws)];
    if (!goal) continue;
    let due = 0;
    let done = 0;
    let minutes = 0;
    let actMinutes = 0;
    for (let d = 0; d < 7; d++) {
      const dt = addDays(ws, d);
      const st = dayStats(slots, dt, history);
      due += st.due;
      done += st.done;
      for (const s of slots) {
        if (occursOn(s, dt) && history.checks[checkKey(dateKey(dt), s.id)] === 'done') {
          const m = durationMin(s.startMin, s.endMin);
          minutes += m;
          if (s.categoryId === goal.categoryId) actMinutes += m;
        }
      }
    }
    const ok =
      goal.kind === 'rate'
        ? due > 0 && (done / due) * 100 >= goal.target
        : (goal.kind === 'act' ? actMinutes : minutes) / 60 >= goal.target;
    if (ok) return true;
  }
  return false;
}

export function trophyState(input: TrophyInput): Record<TrophyId, boolean> {
  const { slots, history, now } = input;
  let totalMin = 0;
  let nDone = 0;
  let early = false;
  let night = false;
  for (const [key, status] of Object.entries(history.checks)) {
    if (status !== 'done') continue;
    nDone++;
    const slot = slots.find((s) => s.id === key.split('|')[1]);
    if (!slot) continue;
    totalMin += durationMin(slot.startMin, slot.endMin);
    if (slot.startMin < 480) early = true;
    if (slot.startMin >= 1320) night = true;
  }
  const { best, perfect } = bestRunAndPerfect(slots, now, history);
  return {
    first: nDone > 0,
    streak3: best >= 3,
    streak7: best >= 7,
    streak30: best >= 30,
    perfectDay: perfect,
    goalWeek: weekGoalReached(input),
    h10: totalMin >= 600,
    h50: totalMin >= 3000,
    h100: totalMin >= 6000,
    focus5: input.focusCount >= 5,
    reviewer: input.reviewCount >= 7,
    early,
    night,
    rest: history.restDays.size > 0,
  };
}

/** Trophées gagnés mais pas encore montrés (« Trophée débloqué : … »). */
export function newTrophies(state: Record<TrophyId, boolean>, seen: readonly string[]): TrophyId[] {
  return TROPHY_IDS.filter((id) => state[id] && !seen.includes(id));
}
