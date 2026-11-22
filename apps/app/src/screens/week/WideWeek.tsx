import {
  dateKey,
  gridWindow,
  hourMarks,
  layoutLanes,
  minuteOfDay,
  nowAndNext,
  occurrencesOn,
  weekDates,
  type Occurrence,
} from '@kairo/core';
import type { Block } from '@kairo/db';
import { WeekGrid, type DayColumnData } from '@kairo/ui';
import { useTranslation } from 'react-i18next';
import { useAppData } from '../../lib/data';
import { useFormat } from '../../lib/format';
import { useSheetActions } from '../../lib/actions';

/** Tablette et ordinateur : la semaine entière en grille, comme l'affiche A3. */
export function WideWeek({ weekStart, now }: { weekStart: Date; now: Date }) {
  const { t } = useTranslation('app');
  const f = useFormat();
  const { blocks, categoryOf } = useAppData();
  const { editBlock } = useSheetActions();
  const dates = weekDates(weekStart);
  const all: Occurrence<Block>[] = dates.flatMap((d) => occurrencesOn(blocks, d));
  const win = gridWindow(all, { defaultStartMin: 420, defaultEndMin: 1380 });
  const { current } = nowAndNext(blocks, now);
  const todayKey = dateKey(now);

  const days: DayColumnData[] = dates.map((d, i) => {
    const id = dateKey(d);
    return {
      id,
      label: f.dayName(i).slice(0, 3).toUpperCase(),
      sublabel: String(d.getDate()),
      fullLabel: `${f.dayName(i)} ${d.getDate()} ${f.month(d.getMonth())}`,
      isToday: id === todayKey,
      blocks: layoutLanes(occurrencesOn(blocks, d)).map(({ occurrence: o, lane, lanes }) => {
        const cat = categoryOf(o.slot.categoryId);
        return {
          id: o.slot.id,
          startMin: o.startMin,
          durationMin: o.durationMin,
          lane,
          lanes,
          title: cat.name,
          timeLabel: `${f.clock(o.slot.startMin)}–${f.clock(o.slot.endMin)}`,
          color: cat.color,
          variant: current?.slot.id === o.slot.id && current.day === id ? 'current' : 'default',
          ariaLabel: `${t('week.blockAria', {
            name: cat.name,
            from: f.clock(o.slot.startMin),
            to: f.clock(o.slot.endMin),
          })}, ${f.dayName(i)}`,
          onClick: () => editBlock(o.slot),
        };
      }),
    };
  });

  return (
    <WeekGrid
      window={win}
      marks={hourMarks(win, { clock: f.clockFormat })}
      days={days}
      nowMin={minuteOfDay(now)}
    />
  );
}
