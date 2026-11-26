/**
 * Rappels de l'APK Android et de l'app iOS : notifications locales programmées dans le système
 * (@capacitor/local-notifications). Elles sonnent même app fermée. Sur Android, sans
 * l'autorisation « alarmes exactes », le système peut les décaler de quelques minutes.
 */
import { LocalNotifications } from '@capacitor/local-notifications';
import type { Notifications, PermissionState } from './types';

const toState = (s: string): PermissionState =>
  s === 'granted' ? 'granted' : s === 'denied' ? 'denied' : 'prompt';

export function createNativeNotifications(): Notifications {
  const granted = async () => (await LocalNotifications.checkPermissions()).display === 'granted';
  return {
    background: true,
    permission: async () => toState((await LocalNotifications.checkPermissions()).display),
    request: async () => toState((await LocalNotifications.requestPermissions()).display),
    schedule: async (list) => {
      if (!(await granted())) return;
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length) {
        await LocalNotifications.cancel({
          notifications: pending.notifications.map((n) => ({ id: n.id })),
        });
      }
      if (!list.length) return;
      await LocalNotifications.schedule({
        notifications: list.map((r) => ({
          id: r.id,
          title: r.title,
          body: r.body,
          schedule: { at: r.at, allowWhileIdle: true },
        })),
      });
    },
    showNow: async (r) => {
      if (!(await granted())) return;
      await LocalNotifications.schedule({
        notifications: [{ id: r.id, title: r.title, body: r.body }],
      });
    },
  };
}
