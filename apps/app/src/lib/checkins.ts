/** Check-in « Fait / Raté » et recalage d'un créneau raté, comme la maquette. */
import {
  addDays,
  dateKey,
  findFreeStart,
  minuteOfDay,
  normalizeMinute,
  startFocus,
  type Occurrence,
} from '@kairo/core';
import { saveBlock, setCheck, useDb, type Block } from '@kairo/db';
import { useHaptics } from '@kairo/platform';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useUi } from '../store';
import { useAppData } from './data';
import { useFormat } from './format';

const RESCHEDULE_FROM_NOW_MIN = 15;

export function useCheckIns() {
  const { t } = useTranslation('app');
  const db = useDb();
  const f = useFormat();
  const haptics = useHaptics();
  const { blocks, categoryOf, settings } = useAppData();
  const flash = useUi((s) => s.flash);
  const clearToast = useUi((s) => s.clearToast);
  const setFocus = useUi((s) => s.setFocus);

  const markDone = useCallback(
    async (o: Occurrence<Block>) => {
      await setCheck(db, o.day, o.slot.id, 'done');
      void haptics.notify('success');
      useUi.getState().setRate({
        day: o.day,
        blockId: o.slot.id,
        name: categoryOf(o.slot.categoryId).name,
      });
    },
    [db, haptics, categoryOf],
  );

  const undo = useCallback((o: Occurrence<Block>) => setCheck(db, o.day, o.slot.id, null), [db]);

  const markMissed = useCallback(
    async (o: Occurrence<Block>) => {
      await setCheck(db, o.day, o.slot.id, 'missed');
      const name = categoryOf(o.slot.categoryId).name;
      const now = new Date();
      const rhythm = { wakeMin: settings.profile.wakeMin, sleepMin: settings.profile.sleepMin };
      const slot = findFreeStart(
        blocks,
        now,
        o.durationMin,
        minuteOfDay(now) + RESCHEDULE_FROM_NOW_MIN,
        rhythm,
      );
      const base = {
        categoryId: o.slot.categoryId,
        days: [],
        steps: [],
        note: '',
      };
      if (slot !== null) {
        flash(t('today.missedMove'), f.clock(slot), async () => {
          await saveBlock(db, {
            ...base,
            once: dateKey(now),
            startMin: slot,
            endMin: normalizeMinute(slot + o.durationMin),
            reminderMin: 5,
          });
          clearToast();
          flash(t('today.moved', { name, time: f.clock(slot) }));
        });
      } else {
        flash(t('today.missedTomorrow'), t('common.yes'), async () => {
          await saveBlock(db, {
            ...base,
            once: dateKey(addDays(now, 1)),
            startMin: o.slot.startMin,
            endMin: o.slot.endMin,
            reminderMin: 10,
          });
          clearToast();
          flash(t('today.addedTomorrow', { time: f.clock(o.slot.startMin) }));
        });
      }
    },
    [db, blocks, categoryOf, settings.profile, flash, clearToast, t, f],
  );

  const focus = useCallback(
    (o: Occurrence<Block>) => setFocus(startFocus(o, Date.now()), o.day),
    [setFocus],
  );

  return { markDone, markMissed, undo, focus };
}
