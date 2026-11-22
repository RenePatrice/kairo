/**
 * Agenda d'un jour, comme l'écran Semaine de la maquette sur téléphone : les créneaux,
 * les moments libres entre eux (« 1 h 30 libre · + ajouter ici ») et la ligne « Maintenant ».
 */
import { dateKey } from './dates';
import { dayAnchor, awakeMinutes, ceilQuarter, type Rhythm } from './rhythm';
import { occurrencesOn, type Occurrence, type Slot } from './schedule';
import { normalizeMinute } from './time';

/** Les heures `from` / `to` sont ancrées sur la journée (elles peuvent dépasser 1440). */
export type AgendaItem<S extends Slot = Slot> =
  | { kind: 'block'; occurrence: Occurrence<S>; from: number; to: number; current: boolean }
  | {
      kind: 'free';
      from: number;
      to: number;
      /** Créneau proposé si l'on touche « + ajouter ici » (heures murales). */
      suggestStart: number;
      suggestEnd: number;
    }
  | { kind: 'now'; minute: number };

export interface AgendaOptions {
  rhythm: Rhythm;
  /** Heure actuelle ; la ligne « Maintenant » n'apparaît que si `now` est ce jour-là. */
  now?: Date;
  /** Durée minimale d'un moment libre affiché. */
  minFree?: number;
  /** Durée maximale proposée pour un nouveau créneau dans un moment libre. */
  maxSuggest?: number;
}

export function freeSuggestion(from: number, to: number, maxSuggest = 120) {
  const start = ceilQuarter(from);
  const end = Math.min(to, start + maxSuggest);
  return { suggestStart: normalizeMinute(start), suggestEnd: normalizeMinute(end) };
}

export function buildAgenda<S extends Slot>(
  slots: readonly S[],
  date: Date,
  { rhythm, now, minFree = 30, maxSuggest = 120 }: AgendaOptions,
): AgendaItem<S>[] {
  const list = occurrencesOn(slots, date)
    .map((o) => {
      const from = dayAnchor(o.startMin, rhythm);
      return { o, from, to: from + o.durationMin };
    })
    .sort((a, b) => a.from - b.from);
  const first = list[0];
  const last = list[list.length - 1];
  if (!first || !last) return [];

  const items: AgendaItem<S>[] = [];
  const isToday = now !== undefined && dateKey(now) === dateKey(date);
  const nowMin = now ? now.getHours() * 60 + now.getMinutes() : 0;
  const nowAbs = dayAnchor(nowMin, rhythm);
  let cursor = Math.min(rhythm.wakeMin, first.from);
  const end = Math.max(rhythm.wakeMin + awakeMinutes(rhythm), last.to);
  let nowShown = !isToday || nowAbs < cursor;

  const pushFree = (from: number, to: number) => {
    if (to - from < minFree) return;
    items.push({ kind: 'free', from, to, ...freeSuggestion(from, to, maxSuggest) });
  };
  const gap = (from: number, to: number) => {
    if (!nowShown && from <= nowAbs && nowAbs < to) {
      pushFree(from, nowAbs);
      items.push({ kind: 'now', minute: nowMin });
      nowShown = true;
      pushFree(nowAbs, to);
    } else pushFree(from, to);
  };

  for (const { o, from, to } of list) {
    gap(cursor, from);
    const current = isToday && from <= nowAbs && nowAbs < to;
    if (current) nowShown = true;
    items.push({ kind: 'block', occurrence: o, from, to, current });
    cursor = Math.max(cursor, to);
  }
  gap(cursor, end);
  return items;
}
