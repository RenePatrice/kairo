/** État de l'interface (Zustand) : écran courant, feuilles ouvertes, toast, focus. Les données vivent dans @kairo/db. */
import type { AiSuggestion } from '@kairo/ai';
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

/** Bouton d'action sous un message de l'assistant (maquette : `actions`). */
export type AiAction =
  | { kind: 'prompt'; label: string; q: string; ghost?: boolean }
  | {
      kind: 'stats' | 'wgoal' | 'review' | 'week' | 'auto' | 'saveReview';
      label: string;
      ghost?: boolean;
    };

/** Moment libre proposé (« 10:45 – 18:00 · 7 h 15 de libre · Réserver → »), heures murales. */
export interface AiSlot {
  startMin: number;
  endMin: number;
  len: string;
  categoryId: string | null;
}

export type AiMessage =
  | { id: string; role: 'user'; text: string }
  | {
      id: string;
      role: 'ai';
      text: string;
      /** Proposition à valider (enregistrée « pending » dans la base). */
      suggestion?: AiSuggestion;
      slots?: AiSlot[];
      actions?: AiAction[];
    };

export interface AssistantChat {
  text: string;
  msgs: AiMessage[];
  thinking: boolean;
  listening: boolean;
}

export const emptyChat = (): AssistantChat => ({
  text: '',
  msgs: [],
  thinking: false,
  listening: false,
});

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
  /** Jour (AAAA-MM-JJ) du créneau en focus, pour le check-in « Terminé ». */
  focusDay: string | null;
  notif: NotifState | null;
  assistant: boolean;
  chat: AssistantChat;
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
  setFocus: (focus: FocusSession | null, day?: string | null) => void;
  setNotif: (notif: NotifState | null) => void;
  setAssistant: (open: boolean) => void;
  patchChat: (patch: Partial<AssistantChat>) => void;
  pushMessages: (msgs: AiMessage[], patch?: Partial<AssistantChat>) => void;
  patchMessage: (id: string, patch: Partial<Extract<AiMessage, { role: 'ai' }>>) => void;
  newChat: () => void;
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
  focusDay: null,
  notif: null,
  assistant: false,
  chat: emptyChat(),
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
  setFocus: (focus, focusDay = null) => set({ focus, focusDay, notif: null, sheet: null }),
  setNotif: (notif) => set({ notif }),
  setAssistant: (assistant) => set({ assistant, sheet: null }),
  patchChat: (patch) => set((s) => ({ chat: { ...s.chat, ...patch } })),
  pushMessages: (msgs, patch) =>
    set((s) => ({ chat: { ...s.chat, ...patch, msgs: [...s.chat.msgs, ...msgs] } })),
  patchMessage: (id, patch) =>
    set((s) => ({
      chat: {
        ...s.chat,
        msgs: s.chat.msgs.map((m) => (m.id === id && m.role === 'ai' ? { ...m, ...patch } : m)),
      },
    })),
  newChat: () => set({ chat: emptyChat() }),
  celebrate: () => set({ celebrateAt: Date.now() }),
}));
