/**
 * Rappels de la maquette : notification N minutes avant le début d'un créneau, et
 * « Fait ou raté ? » à sa fin. Ici on calcule seulement ce qui doit sonner à une minute donnée ;
 * l'envoi (bannière, notification système) passe par l'interface `platform`.
 */
import { checkKey, type CheckMap } from './checkin';
import { addDays, dateKey, startOfDay } from './dates';
import { reminderMinute } from './rhythm';
import { occurrencesOn, type Occurrence, type Slot } from './schedule';
import { normalizeMinute } from './time';

export interface ReminderSlot extends Slot {
  /** Minutes avant le début ; `null` = aucun rappel. */
  reminderMin: number | null;
}

export type DueReminder<S extends ReminderSlot> =
  | { kind: 'start'; occurrence: Occurrence<S>; lead: number }
  | { kind: 'end'; occurrence: Occurrence<S> };

export interface ReminderOptions {
  remind: boolean;
  endCheck: boolean;
  checks: CheckMap;
}

/** Rappels qui tombent à la minute `minute` du jour `date`. */
export function remindersAt<S extends ReminderSlot>(
  slots: readonly S[],
  date: Date,
  minute: number,
  { remind, endCheck, checks }: ReminderOptions,
): DueReminder<S>[] {
  const out: DueReminder<S>[] = [];
  const day = dateKey(date);
  for (const o of occurrencesOn(slots, date)) {
    const lead = o.slot.reminderMin;
    if (remind && lead !== null && reminderMinute(o.startMin, lead) === minute) {
      out.push({ kind: 'start', occurrence: o, lead });
    }
    const end = normalizeMinute(o.startMin + o.durationMin);
    if (endCheck && end === minute && !checks[checkKey(day, o.slot.id)]) {
      out.push({ kind: 'end', occurrence: o });
    }
  }
  return out;
}

export interface UpcomingReminder {
  /** Clé stable : `AAAA-MM-JJ|idDuCréneau|start` ou `…|end`. */
  key: string;
  kind: 'start' | 'end';
  slotId: string;
  /** Instant exact où le rappel doit sonner (changement d'heure compris). */
  at: Date;
  /** Minutes avant le début (rappel de début), 0 sinon. */
  lead: number;
}

export interface UpcomingOptions extends ReminderOptions {
  /** Journées off : aucun rappel. */
  restDays: ReadonlySet<string>;
  /** Nombre de jours couverts, aujourd'hui compris (2–3 jours : limite iOS de 64 notifications). */
  days?: number;
  /** Nombre maximum de rappels renvoyés (les plus proches d'abord). */
  limit?: number;
}

export const UPCOMING_DAYS = 3;
export const UPCOMING_LIMIT = 60;

/**
 * Rappels à programmer dans le système à partir de `from` : début (N minutes avant) et fin
 * (« Fait ou raté ? ») des créneaux des prochains jours, triés par heure.
 */
export function upcomingReminders<S extends ReminderSlot>(
  slots: readonly S[],
  from: Date,
  {
    remind,
    endCheck,
    checks,
    restDays,
    days = UPCOMING_DAYS,
    limit = UPCOMING_LIMIT,
  }: UpcomingOptions,
): UpcomingReminder[] {
  const out: UpcomingReminder[] = [];
  const end = addDays(startOfDay(from), days).getTime();
  // Un rappel peut tomber avant minuit pour un créneau du lendemain : on parcourt aussi
  // la veille et le jour qui suit la fenêtre, puis on ne garde que ce qui tombe dedans.
  for (let i = -1; i <= days; i++) {
    const date = addDays(startOfDay(from), i);
    const day = dateKey(date);
    if (restDays.has(day)) continue;
    for (const o of occurrencesOn(slots, date)) {
      const lead = o.slot.reminderMin;
      if (remind && lead !== null) {
        const at = new Date(o.start.getTime() - lead * 60_000);
        if (at > from && at.getTime() < end) {
          out.push({
            key: `${day}|${o.slot.id}|start`,
            kind: 'start',
            slotId: o.slot.id,
            at,
            lead,
          });
        }
      }
      if (endCheck && !checks[checkKey(day, o.slot.id)] && o.end > from && o.end.getTime() < end) {
        out.push({
          key: `${day}|${o.slot.id}|end`,
          kind: 'end',
          slotId: o.slot.id,
          at: o.end,
          lead: 0,
        });
      }
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, limit);
}

/** Identifiant entier stable (31 bits) pour les notifications système, à partir d'une clé. */
export function reminderId(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) & 0x7fffffff;
}
