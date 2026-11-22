/** Ouverture des fiches, comme `openBlock` / `openAct` dans la maquette. */
import { isoWeekday } from '@kairo/core';
import type { Block, Category } from '@kairo/db';
import { useCallback } from 'react';
import { emptyActForm, useUi, type BlockForm } from '../store';
import { useAppData } from './data';

export const DEFAULT_NEW_START = 1080;
export const DEFAULT_NEW_END = 1140;
export const DEFAULT_REMINDER = 10;

export function formFromBlock(b: Block): BlockForm {
  return {
    id: b.id,
    categoryId: b.categoryId,
    days: [...b.days],
    once: b.once,
    startMin: b.startMin,
    endMin: b.endMin,
    reminderMin: b.reminderMin,
    steps: [...b.steps],
    note: b.note,
    stepInput: '',
  };
}

export function useSheetActions() {
  const { categories } = useAppData();
  const openBlock = useUi((s) => s.openBlock);
  const openAct = useUi((s) => s.openAct);

  /** Nouveau créneau : le jour donné (sinon aujourd'hui), 18:00–19:00 par défaut. */
  const newBlock = useCallback(
    (day?: number, startMin = DEFAULT_NEW_START, endMin = DEFAULT_NEW_END) => {
      const first = categories[0];
      const form: BlockForm = {
        id: null,
        categoryId: first?.id ?? null,
        days: [day ?? isoWeekday(new Date())],
        once: null,
        startMin,
        endMin,
        reminderMin: DEFAULT_REMINDER,
        steps: [],
        note: '',
        stepInput: '',
      };
      if (!first) {
        // Pas encore d'activité : on la crée d'abord, puis on revient au créneau.
        useUi.setState({ blockForm: form });
        openAct(emptyActForm(categories.length), 'block');
        return;
      }
      openBlock(form);
    },
    [categories, openAct, openBlock],
  );

  const editBlock = useCallback((b: Block) => openBlock(formFromBlock(b)), [openBlock]);

  const newActivity = useCallback(
    (returnTo: 'block' | null = null) => openAct(emptyActForm(categories.length), returnTo),
    [categories.length, openAct],
  );

  const editActivity = useCallback(
    (c: Category) =>
      openAct({ id: c.id, name: c.name, color: c.color, weeklyGoalH: c.weeklyGoalH }),
    [openAct],
  );

  return { newBlock, editBlock, newActivity, editActivity };
}
