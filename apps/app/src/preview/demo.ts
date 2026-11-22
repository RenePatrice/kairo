/**
 * Données de démonstration de la page de prévisualisation (Phase 0). Toute la logique horaire
 * passe par @kairo/core ; ce fichier ne fait qu'assembler des données pour les composants.
 */
import {
  addDays,
  dateKey,
  durationMin,
  formatDuration,
  formatRange,
  formatSpokenTime,
  gridWindow,
  hourMarks,
  isoWeekday,
  layoutLanes,
  minuteOfDay,
  normalizeMinute,
  nowAndNext,
  occurrencesOn,
  progress,
  remainingMs,
  startOfWeek,
  type ClockFormat,
  type Locale,
  type Slot,
} from '@kairo/core';
import {
  activityPalette,
  type DayColumnData,
  type GridBlock,
  type NowCardProps,
  type TimeBlockVariant,
} from '@kairo/ui';
import type { TFunction } from 'i18next';

type PaletteKey = (typeof activityPalette)[number]['key'];

/** Couleur d'activité prise dans la palette des tokens. */
export function paletteColor(key: PaletteKey): string {
  return activityPalette.find((c) => c.key === key)?.hex ?? activityPalette[0].hex;
}

export interface DemoActivity {
  id: string;
  color: string;
  sleep?: boolean;
}

export interface DemoSlot extends Slot {
  activityId: string;
  /** Proposé par l'IA, pas encore validé. */
  ghost?: boolean;
  /** Titre libre (sinon : nom traduit de l'activité). */
  title?: string;
}

export const activities: DemoActivity[] = [
  { id: 'cours', color: paletteColor('ardoise') },
  { id: 'labo', color: paletteColor('miel') },
  { id: 'udemy', color: paletteColor('pivoine') },
  { id: 'sport', color: paletteColor('azur') },
  { id: 'diner', color: paletteColor('sable') },
  { id: 'revisions', color: paletteColor('lavande') },
  { id: 'focus', color: paletteColor('lagon') },
  { id: 'sommeil', color: paletteColor('ardoise'), sleep: true },
];

const WEEKDAYS = [0, 1, 2, 3, 4];
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

export const baseSlots: DemoSlot[] = [
  { id: 'cours', activityId: 'cours', days: WEEKDAYS, startMin: 510, endMin: 750 },
  { id: 'labo', activityId: 'labo', days: [1, 3], startMin: 840, endMin: 1020 },
  { id: 'udemy', activityId: 'udemy', days: WEEKDAYS, startMin: 1050, endMin: 1170 },
  { id: 'sport', activityId: 'sport', days: [0, 2, 5], startMin: 1080, endMin: 1140 },
  { id: 'diner', activityId: 'diner', days: EVERY_DAY, startMin: 1170, endMin: 1215 },
  { id: 'revisions', activityId: 'revisions', days: EVERY_DAY, startMin: 1230, endMin: 1320 },
  { id: 'sommeil', activityId: 'sommeil', days: EVERY_DAY, startMin: 1410, endMin: 420 },
];

/** Un créneau « focus » commencé à l'heure pile, pour que la NowCard ait toujours un bloc en cours. */
export function focusSlotFor(now: Date): DemoSlot {
  const start = normalizeMinute(Math.floor(minuteOfDay(now) / 60) * 60);
  return {
    id: 'focus-now',
    activityId: 'focus',
    days: [],
    once: dateKey(now),
    startMin: start,
    endMin: normalizeMinute(start + 90),
  };
}

/** Proposition simulée de l'assistant : du foot samedi matin. */
export function ghostProposal(): DemoSlot {
  return {
    id: 'ghost-foot',
    activityId: 'sport',
    days: [5],
    startMin: 600,
    endMin: 690,
    ghost: true,
  };
}

export function activityOf(slot: DemoSlot): DemoActivity {
  return activities.find((a) => a.id === slot.activityId) ?? (activities[0] as DemoActivity);
}

export function titleOf(slot: DemoSlot, t: TFunction): string {
  return slot.title ?? t(`app:preview.activities.${slot.activityId}`);
}

function variantOf(slot: DemoSlot, isCurrent: boolean): TimeBlockVariant {
  if (slot.ghost) return 'ghost';
  if (activityOf(slot).sleep) return 'sleep';
  return isCurrent ? 'current' : 'default';
}

export interface WeekView {
  window: { startMin: number; endMin: number };
  marks: Array<{ minute: number; label: string }>;
  days: DayColumnData[];
  nowMin: number;
}

/** Assemble la grille de la semaine en cours. */
export function buildWeek(
  slots: DemoSlot[],
  now: Date,
  locale: Locale,
  clock: ClockFormat,
  t: TFunction,
  onOpen: (slot: DemoSlot, dayId: string) => void,
): WeekView {
  const monday = startOfWeek(now, 1);
  const todayKey = dateKey(now);
  const { current } = nowAndNext(slots, now);
  const weekdayFmt = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  const fullFmt = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const longDay = new Intl.DateTimeFormat(locale, { weekday: 'long' });

  const dates = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const awake = dates.flatMap((d) =>
    occurrencesOn(slots, d).filter((o) => !activityOf(o.slot).sleep),
  );
  const window = gridWindow(awake, { defaultStartMin: 420, defaultEndMin: 1440 });

  const days: DayColumnData[] = dates.map((d) => {
    const id = dateKey(d);
    const lanes = layoutLanes(occurrencesOn(slots, d));
    const blocks: GridBlock[] = lanes.map(({ occurrence: o, lane, lanes: count }) => {
      const title = titleOf(o.slot, t);
      const end = o.startMin + o.durationMin;
      const isCurrent = current?.slot.id === o.slot.id && current.day === id;
      return {
        id: o.slot.id,
        startMin: o.startMin,
        durationMin: o.durationMin,
        lane,
        lanes: count,
        title,
        timeLabel: formatRange(o.startMin, end, clock),
        color: activityOf(o.slot).color,
        variant: variantOf(o.slot, isCurrent),
        ariaLabel: t('ui:block.aria', {
          title,
          start: formatSpokenTime(o.startMin, locale, clock),
          end: formatSpokenTime(end, locale, clock),
          day: longDay.format(d),
        }),
        onClick: () => onOpen(o.slot, id),
      };
    });
    return {
      id,
      label: weekdayFmt.format(d).replace('.', '').toUpperCase(),
      sublabel: String(d.getDate()),
      fullLabel: fullFmt.format(d),
      isToday: id === todayKey,
      blocks,
    };
  });

  return { window, marks: hourMarks(window, { clock }), days, nowMin: minuteOfDay(now) };
}

/** Données de la NowCard à partir du bloc en cours et du suivant. */
export function buildNow(
  slots: DemoSlot[],
  now: Date,
  clock: ClockFormat,
  t: TFunction,
): Pick<NowCardProps, 'current' | 'next'> {
  const awake = slots.filter((s) => !activityOf(s).sleep && !s.ghost);
  const { current, next } = nowAndNext(awake, now);
  return {
    current: current
      ? {
          title: titleOf(current.slot, t),
          color: activityOf(current.slot).color,
          timeLabel: formatRange(current.startMin, current.startMin + current.durationMin, clock),
          remainingLabel: formatDuration(Math.ceil(remainingMs(current, now) / 60000)),
          progress: progress(current, now),
        }
      : null,
    next: next
      ? {
          title: titleOf(next.slot, t),
          color: activityOf(next.slot).color,
          timeLabel: formatRange(next.startMin, next.startMin + next.durationMin, clock),
        }
      : null,
  };
}

export function slotTimeLabel(slot: DemoSlot, clock: ClockFormat): string {
  return formatRange(slot.startMin, slot.startMin + durationMin(slot.startMin, slot.endMin), clock);
}

export function dayNameFor(dayIndex: number, now: Date, locale: Locale): string {
  const date = addDays(startOfWeek(now, 1), dayIndex);
  return new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date);
}

export { isoWeekday };
