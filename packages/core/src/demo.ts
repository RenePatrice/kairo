/**
 * « Données de démo » de la maquette : 8 semaines de check-ins simulés, de façon
 * déterministe (même résultat à chaque fois pour un même planning).
 */
import { checkKey, type CheckMap, type CheckStatus } from './checkin';
import { addDays, dateKey } from './dates';
import { occursOn, type Slot } from './schedule';

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
