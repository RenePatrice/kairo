/**
 * Mode focus de la maquette : compte à rebours jusqu'à la fin du créneau, en continu
 * ou en Pomodoro 25/5, avec pause.
 */
import type { Occurrence } from './schedule';

export const POMODORO_WORK_MIN = 25;
export const POMODORO_BREAK_MIN = 5;
const MS = 60_000;

export interface Pomodoro {
  phase: 'work' | 'break';
  endAt: number;
  /** Cycles de travail terminés. */
  cycles: number;
}

export interface FocusSession {
  slotId: string;
  /** Fin prévue (ms depuis l'époque Unix). */
  endAt: number;
  totalMs: number;
  /** Temps restant figé pendant une pause, sinon `null`. */
  pausedLeft: number | null;
  pomodoro: Pomodoro | null;
}

/** Démarre le focus : jusqu'à la fin du créneau s'il est en cours, sinon pour toute sa durée. */
export function startFocus(occ: Occurrence, nowMs: number): FocusSession {
  const totalMs = occ.durationMin * MS;
  const running = occ.start.getTime() <= nowMs && nowMs < occ.end.getTime();
  const left = running ? occ.end.getTime() - nowMs : totalMs;
  return { slotId: occ.slot.id, endAt: nowMs + left, totalMs, pausedLeft: null, pomodoro: null };
}

function phaseMs(p: Pomodoro): number {
  return (p.phase === 'work' ? POMODORO_WORK_MIN : POMODORO_BREAK_MIN) * MS;
}

/** Temps restant affiché et progression 0..1 de l'anneau. */
export function focusRemaining(
  f: FocusSession,
  nowMs: number,
): { leftMs: number; progress: number } {
  const target = f.pomodoro ? f.pomodoro.endAt : f.endAt;
  const total = f.pomodoro ? phaseMs(f.pomodoro) : f.totalMs;
  const leftMs = f.pausedLeft ?? Math.max(0, target - nowMs);
  return { leftMs, progress: Math.min(1, Math.max(0, 1 - leftMs / total)) };
}

export function pauseFocus(f: FocusSession, nowMs: number): FocusSession {
  if (f.pausedLeft !== null) return f;
  return { ...f, pausedLeft: focusRemaining(f, nowMs).leftMs };
}

export function resumeFocus(f: FocusSession, nowMs: number): FocusSession {
  if (f.pausedLeft === null) return f;
  const end = nowMs + f.pausedLeft;
  return f.pomodoro
    ? { ...f, pausedLeft: null, pomodoro: { ...f.pomodoro, endAt: end } }
    : { ...f, pausedLeft: null, endAt: end };
}

export function setPomodoro(f: FocusSession, on: boolean, nowMs: number): FocusSession {
  return {
    ...f,
    pausedLeft: null,
    pomodoro: on ? { phase: 'work', endAt: nowMs + POMODORO_WORK_MIN * MS, cycles: 0 } : null,
  };
}

/** Passe à la phase suivante quand la phase en cours est finie. `changed` sert à prévenir l'utilisateur. */
export function tickPomodoro(
  f: FocusSession,
  nowMs: number,
): { session: FocusSession; changed: Pomodoro['phase'] | null } {
  const p = f.pomodoro;
  if (!p || f.pausedLeft !== null || nowMs < p.endAt) return { session: f, changed: null };
  const work = p.phase === 'work';
  const next: Pomodoro = {
    phase: work ? 'break' : 'work',
    endAt: nowMs + (work ? POMODORO_BREAK_MIN : POMODORO_WORK_MIN) * MS,
    cycles: p.cycles + (work ? 1 : 0),
  };
  return { session: { ...f, pomodoro: next }, changed: next.phase };
}

/** Découpe un temps restant en heures, minutes, secondes pour l'affichage « 1:05:09 » / « 25:00 ». */
export function splitDuration(ms: number): { h: number; m: number; s: number } {
  const total = Math.max(0, Math.floor(ms / 1000));
  return { h: Math.floor(total / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 };
}
