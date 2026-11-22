/** État de l'interface (Zustand) : écran courant, feuilles ouvertes, toast, focus. Les données vivent dans @kairo/db. */
import { isoWeekday, type FocusSession } from '@kairo/core';
import { activityPalette } from '@kairo/ui';
import { create } from 'zustand';

export type Screen = 'lang' | 'welcome' | 'rhythm' | 'acts' | 'today' | 'week' | 'stats' | 'me';
export type SheetKind = 'block' | 'act' | 'dup' | null;

export interface BlockForm {
  id: string | null;
  categoryId: string | null;
  days: number[];
  once: string | null;
  startMin: number;
  endMin: number;
  reminderMin: number | null;
  steps: string[];
  note: string;
  stepInput: string;
}

export interface ActForm {
  id: string | null;
  name: string;
  color: string;
  weeklyGoalH: number;
}

export interface ToastState {
  id: number;
  message: string;
  actionLabel?: string;
  action?: () => void | Promise<void>;
}

export interface NotifState {
  kind: 'start' | 'end';
  blockId: string;
  /** Minutes avant le début (rappel) ; 0 = « commence ». */
  lead: number;
}

export function paletteColor(index: number): string {
  const c = activityPalette[index % activityPalette.length] ?? activityPalette[0];
  return c.hex;
}

export const emptyActForm = (count: number): ActForm => ({
  id: null,
  name: '',
  color: paletteColor(count),
  weeklyGoalH: 5,
});

interface UiState {
  screen: Screen | null;
  weekDay: number;
  sheet: SheetKind;
  returnTo: 'block' | null;
  blockForm: BlockForm | null;
  actForm: ActForm;
  dup: number[];
  toast: ToastState | null;
  focus: FocusSession | null;
  notif: NotifState | null;
  assistant: boolean;
  celebrateAt: number;

  go: (screen: Screen) => void;
  setWeekDay: (day: number) => void;
  closeSheet: () => void;
  openBlock: (form: BlockForm) => void;
  patchBlock: (patch: Partial<BlockForm>) => void;
  openAct: (form: ActForm, returnTo?: 'block' | null) => void;
  patchAct: (patch: Partial<ActForm>) => void;
  setActForm: (form: ActForm) => void;
  openDup: () => void;
  toggleDup: (day: number) => void;
  flash: (message: string, actionLabel?: string, action?: () => void | Promise<void>) => void;
  clearToast: () => void;
  setFocus: (focus: FocusSession | null) => void;
  setNotif: (notif: NotifState | null) => void;
  setAssistant: (open: boolean) => void;
  celebrate: () => void;
}

let toastId = 0;

export const useUi = create<UiState>((set) => ({
  screen: null,
  weekDay: isoWeekday(new Date()),
  sheet: null,
  returnTo: null,
  blockForm: null,
  actForm: emptyActForm(0),
  dup: [],
  toast: null,
  focus: null,
  notif: null,
  assistant: false,
  celebrateAt: 0,

  go: (screen) => set({ screen, sheet: null }),
  setWeekDay: (weekDay) => set({ weekDay }),
  closeSheet: () => set({ sheet: null }),
  openBlock: (blockForm) => set({ sheet: 'block', blockForm }),
  patchBlock: (patch) =>
    set((s) => (s.blockForm ? { blockForm: { ...s.blockForm, ...patch } } : {})),
  openAct: (actForm, returnTo = null) => set({ sheet: 'act', actForm, returnTo }),
  patchAct: (patch) => set((s) => ({ actForm: { ...s.actForm, ...patch } })),
  setActForm: (actForm) => set({ actForm }),
  openDup: () => set({ sheet: 'dup', dup: [] }),
  toggleDup: (day) =>
    set((s) => ({ dup: s.dup.includes(day) ? s.dup.filter((d) => d !== day) : [...s.dup, day] })),
  flash: (message, actionLabel, action) =>
    set({ toast: { id: ++toastId, message, actionLabel, action } }),
  clearToast: () => set({ toast: null }),
  setFocus: (focus) => set({ focus, notif: null, sheet: null }),
  setNotif: (notif) => set({ notif }),
  setAssistant: (assistant) => set({ assistant, sheet: null }),
  celebrate: () => set({ celebrateAt: Date.now() }),
}));
