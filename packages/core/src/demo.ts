/**
 * « Données de démo » de la maquette : 8 semaines de check-ins simulés, de façon
 * déterministe (même résultat à chaque fois pour un même planning).
 */
import { checkKey, type CheckMap, type CheckStatus } from './checkin';
import { addDays, dateKey, startOfWeek, weekKey } from './dates';
import { occursOn, type Slot } from './schedule';
import type { EnergyLevel } from './stats';
import { weekLoads } from './week';

export const DEMO_DAYS = 55;

/** Nombre pseudo-aléatoire stable dans [0, 1) à partir d'un texte (FNV-1a). */
export function stableRandom(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

/** Check-ins des `days` jours précédant `today` pour les créneaux récurrents. */
export function demoHistory(slots: readonly Slot[], today: Date, days = DEMO_DAYS): CheckMap {
  const out: Record<string, CheckStatus> = {};
  for (let i = 1; i <= days; i++) {
    const d = addDays(today, -i);
    const chance = 0.9 - i * 0.007;
    for (const s of slots) {
      if (s.once || !occursOn(s, d)) continue;
      const k = checkKey(dateKey(d), s.id);
      out[k] = stableRandom(k) < chance ? 'done' : 'missed';
    }
  }
  return out;
}

export interface DemoExtras {
  /** Notes d'énergie des créneaux faits (clé `AAAA-MM-JJ|id`). */
  energy: Record<string, EnergyLevel>;
  /** Objectifs du jour « N créneaux » (clé `D2026-11-22`). */
  dayGoals: Array<{ key: string; target: number }>;
  /** Objectifs de semaine en heures (clé `W2026-47`). */
  weekGoals: Array<{ key: string; target: number }>;
  /** Humeurs de bilans passés (clé `D…` ou `W…`). */
  reviews: Array<{ key: string; mood: number }>;
}

/** Le reste de la démo de la maquette : énergie, objectifs et humeurs, dérivés des check-ins. */
export function demoExtras(slots: readonly Slot[], today: Date, checks: CheckMap): DemoExtras {
  const energy: Record<string, EnergyLevel> = {};
  for (const [k, status] of Object.entries(checks)) {
    if (status !== 'done' || stableRandom(`${k}e`) >= 0.7) continue;
    const slot = slots.find((s) => s.id === k.split('|')[1]);
    if (!slot) continue;
    const v = stableRandom(`${k}v`);
    energy[k] =
      slot.startMin < 720 ? (v < 0.7 ? 3 : 2) : slot.startMin < 1080 ? 2 : v < 0.5 ? 1 : 2;
  }
  const dayGoals: DemoExtras['dayGoals'] = [];
  const reviews: DemoExtras['reviews'] = [];
  for (let j = 1; j <= 13; j++) {
    const d = addDays(today, -j);
    const dk = dateKey(d);
    const n = slots.filter((s) => !s.once && occursOn(s, d)).length;
    if (!n) continue;
    const hv = stableRandom(`${dk}m`);
    reviews.push({ key: `D${dk}`, mood: hv < 0.1 ? 2 : hv < 0.35 ? 3 : hv < 0.8 ? 4 : 5 });
    if (stableRandom(`${dk}g`) < 0.7) dayGoals.push({ key: `D${dk}`, target: n });
  }
  const plannedH = Math.max(
    1,
    Math.round(weekLoads(slots, startOfWeek(today)).reduce((a, b) => a + b, 0) / 60),
  );
  const weekGoals: DemoExtras['weekGoals'] = [];
  for (let w = 1; w <= 7; w++) {
    const key = weekKey(addDays(today, -7 * w));
    weekGoals.push({ key, target: Math.max(1, Math.round(plannedH * 0.8)) });
    if (w <= 3) reviews.push({ key, mood: w === 1 ? 4 : 3 });
  }
  return { energy, dayGoals, weekGoals, reviews };
}
