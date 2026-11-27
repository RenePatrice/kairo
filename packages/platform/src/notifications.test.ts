import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createWebNotifications,
  REMINDER_GRACE_MS,
  WEB_MAX_DELAY_MS,
  type WebNotificationEnv,
} from './webNotifications';

const pending: Array<{ id: number }> = [];
const plugin = {
  display: 'granted',
  scheduled: [] as unknown[],
  cancelled: [] as unknown[],
};
vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    checkPermissions: vi.fn(async () => ({ display: plugin.display })),
    requestPermissions: vi.fn(async () => ({ display: 'granted' })),
    getPending: vi.fn(async () => ({ notifications: [...pending] })),
    cancel: vi.fn(async (o: unknown) => void plugin.cancelled.push(o)),
    schedule: vi.fn(async (o: unknown) => void plugin.scheduled.push(o)),
  },
}));

function fakeEnv(permission: NotificationPermission = 'granted') {
  const timers = new Map<number, { run: () => void; ms: number }>();
  let next = 1;
  const shown: string[] = [];
  const env: WebNotificationEnv & { hidden: boolean } = {
    hidden: true,
    api: { permission, requestPermission: vi.fn(async () => 'granted' as const) },
    show: vi.fn(async (title: string, body: string) => void shown.push(`${title} — ${body}`)),
    isHidden: () => env.hidden,
    now: () => 1_000_000,
    setTimer: (run, ms) => {
      timers.set(next, { run, ms });
      return next++;
    },
    clearTimer: (id) => void timers.delete(id),
  };
  return { env, timers, shown };
}

const at = (ms: number) => new Date(1_000_000 + ms);

describe('notifications web', () => {
  it('lit et demande l’autorisation', async () => {
    const { env } = fakeEnv('default');
    const n = createWebNotifications(env);
    expect(n.background).toBe(false);
    expect(await n.permission()).toBe('prompt');
    expect(await n.request()).toBe('granted');
    expect(await createWebNotifications({ ...env, api: null }).permission()).toBe('unsupported');
    expect(await createWebNotifications({ ...env, api: null }).request()).toBe('unsupported');
    expect(await createWebNotifications(fakeEnv('denied').env).permission()).toBe('denied');
  });

  it('minute les rappels des prochaines 24 h et remplace la liste précédente', async () => {
    const { env, timers, shown } = fakeEnv();
    const n = createWebNotifications(env);
    await n.schedule([
      { id: 1, at: at(-REMINDER_GRACE_MS - 1), title: 'trop tard', body: '' },
      { id: 2, at: at(60_000), title: 'Salle dans 10 min', body: '18:00 – 19:00' },
      { id: 3, at: at(WEB_MAX_DELAY_MS + 1), title: 'trop loin', body: '' },
    ]);
    expect([...timers.values()].map((x) => x.ms)).toEqual([60_000]);
    [...timers.values()][0]?.run();
    expect(shown).toEqual(['Salle dans 10 min — 18:00 – 19:00']);
    await n.schedule([]);
    expect(timers.size).toBe(0);
  });

  it('montre tout de suite un rappel en retard de moins de 2 min, une seule fois', async () => {
    const { env, timers, shown } = fakeEnv();
    const n = createWebNotifications(env);
    const late = { id: 4, at: at(-30_000), title: 'Loyer demain', body: '' };
    await n.schedule([late]);
    expect(shown).toEqual(['Loyer demain — ']);
    expect(timers.size).toBe(0);
    await n.schedule([late]);
    expect(shown).toHaveLength(1);
  });

  it('au premier plan, laisse la bannière de l’app ; sans autorisation, ne montre rien', async () => {
    const { env, timers, shown } = fakeEnv();
    env.hidden = false;
    await createWebNotifications(env).schedule([{ id: 1, at: at(1000), title: 'a', body: '' }]);
    [...timers.values()][0]?.run();
    expect(shown).toEqual([]);

    const denied = fakeEnv('denied');
    const n = createWebNotifications(denied.env);
    await n.showNow({ id: 9, title: 'test', body: '' });
    expect(denied.shown).toEqual([]);
  });

  it('montre un rappel de test tout de suite si autorisé', async () => {
    const { env, shown } = fakeEnv();
    env.hidden = false;
    await createWebNotifications(env).showNow({ id: 9, title: 'Test', body: 'ok' });
    expect(shown).toEqual(['Test — ok']);
  });

  it('ne fait rien hors navigateur', async () => {
    const n = createWebNotifications(null);
    expect(await n.permission()).toBe('unsupported');
    await expect(n.schedule([{ id: 1, at: at(1), title: '', body: '' }])).resolves.toBeUndefined();
    await expect(n.showNow({ id: 1, title: '', body: '' })).resolves.toBeUndefined();
  });
});

describe('notifications natives', () => {
  beforeEach(() => {
    plugin.display = 'granted';
    plugin.scheduled = [];
    plugin.cancelled = [];
    pending.length = 0;
  });

  it('remplace les notifications programmées, qui sonnent app fermée', async () => {
    const { createNativeNotifications } = await import('./nativeNotifications');
    const n = createNativeNotifications();
    expect(n.background).toBe(true);
    expect(await n.permission()).toBe('granted');
    pending.push({ id: 7 });
    const when = new Date(Date.now() + 3_600_000);
    const past = new Date(Date.now() - 60_000);
    await n.schedule([
      { id: 1, at: when, title: 'Salle dans 10 min', body: '18:00 – 19:00' },
      { id: 9, at: past, title: 'déjà montré', body: '' },
    ]);
    expect(plugin.cancelled).toEqual([{ notifications: [{ id: 7 }] }]);
    expect(plugin.scheduled).toEqual([
      {
        notifications: [
          {
            id: 1,
            title: 'Salle dans 10 min',
            body: '18:00 – 19:00',
            schedule: { at: when, allowWhileIdle: true },
          },
        ],
      },
    ]);
    await n.schedule([]);
    expect(plugin.scheduled).toHaveLength(1);
  });

  it('ne programme rien sans autorisation, et la demande en contexte', async () => {
    const { createNativeNotifications } = await import('./nativeNotifications');
    const n = createNativeNotifications();
    plugin.display = 'prompt-with-rationale';
    expect(await n.permission()).toBe('prompt');
    await n.schedule([{ id: 1, at: new Date(), title: 'a', body: '' }]);
    await n.showNow({ id: 2, title: 'b', body: '' });
    expect(plugin.scheduled).toEqual([]);
    expect(await n.request()).toBe('granted');
    plugin.display = 'granted';
    await n.showNow({ id: 2, title: 'b', body: 'c' });
    expect(plugin.scheduled).toEqual([{ notifications: [{ id: 2, title: 'b', body: 'c' }] }]);
    plugin.display = 'denied';
    expect(await n.permission()).toBe('denied');
  });
});
