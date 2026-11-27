/**
 * Rappels dans un navigateur : API Notification (via le service worker de la PWA quand il est
 * là). Un navigateur ne peut pas programmer une notification app fermée : les rappels sont
 * minutés tant que la page vit, et ne s'affichent dans le système que si l'onglet est en
 * arrière-plan (au premier plan, la bannière de l'app s'en charge).
 */
import type { Notifications, PermissionState, ScheduledReminder } from './types';

/** Au-delà, on ne minute pas : la liste est reprogrammée régulièrement par l'app. */
export const WEB_MAX_DELAY_MS = 24 * 60 * 60_000;
/**
 * Un rappel en retard de moins de 2 min est montré tout de suite : la liste peut être
 * reprogrammée à l'instant même où il devait sonner (sinon il serait perdu).
 */
export const REMINDER_GRACE_MS = 2 * 60_000;
const ICON = '/icon-192.png';

export interface WebNotificationEnv {
  /** `null` si le navigateur ne connaît pas l'API (Safari ancien, WebView). */
  api: {
    permission: NotificationPermission;
    requestPermission(): Promise<NotificationPermission>;
  } | null;
  show(title: string, body: string, tag: string): Promise<void>;
  isHidden(): boolean;
  now(): number;
  setTimer(run: () => void, ms: number): number;
  clearTimer(id: number): void;
}

const toState = (p: NotificationPermission): PermissionState =>
  p === 'granted' ? 'granted' : p === 'denied' ? 'denied' : 'prompt';

export function createWebNotifications(
  env: WebNotificationEnv | null = defaultEnv(),
): Notifications {
  let timers: number[] = [];
  /** Rappels déjà montrés : jamais deux fois le même. */
  const fired = new Set<number>();
  const granted = () => env?.api?.permission === 'granted';
  const fire = (r: ScheduledReminder) => {
    if (!env || fired.has(r.id) || !granted() || !env.isHidden()) return;
    fired.add(r.id);
    void env.show(r.title, r.body, String(r.id));
  };
  return {
    background: false,
    permission: () => Promise.resolve(env?.api ? toState(env.api.permission) : 'unsupported'),
    request: async () => (env?.api ? toState(await env.api.requestPermission()) : 'unsupported'),
    schedule: (list: readonly ScheduledReminder[]) => {
      if (!env) return Promise.resolve();
      for (const id of timers) env.clearTimer(id);
      timers = [];
      for (const r of list) {
        const delay = r.at.getTime() - env.now();
        if (delay > WEB_MAX_DELAY_MS || delay <= -REMINDER_GRACE_MS) continue;
        if (delay <= 0) fire(r);
        else timers.push(env.setTimer(() => fire(r), delay));
      }
      return Promise.resolve();
    },
    showNow: async (r) => {
      if (env && granted()) await env.show(r.title, r.body, String(r.id));
    },
  };
}

function defaultEnv(): WebNotificationEnv | null {
  if (typeof window === 'undefined') return null;
  const api = typeof Notification === 'undefined' ? null : Notification;
  return {
    api,
    show: async (title, body, tag) => {
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg) await reg.showNotification(title, { body, tag, icon: ICON });
      else if (api) new Notification(title, { body, tag, icon: ICON });
    },
    isHidden: () => document.visibilityState === 'hidden',
    now: () => Date.now(),
    setTimer: (run, ms) => window.setTimeout(run, ms),
    clearTimer: (id) => window.clearTimeout(id),
  };
}
