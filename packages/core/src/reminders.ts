/**
 * Rappels de la maquette : notification N minutes avant le début d'un créneau, et
 * « Fait ou raté ? » à sa fin. Ici on calcule seulement ce qui doit sonner à une minute donnée ;
 * l'envoi (bannière, notification système) passe par l'interface `platform`.
 */
import { checkKey, type CheckMap } from './checkin';
import { dateKey } from './dates';
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
