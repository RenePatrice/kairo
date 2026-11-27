import { describe, expect, it, vi } from 'vitest';
import { webBack } from './back';

const state = { listener: null as null | (() => void), minimized: 0, removed: 0 };
vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn(async (_e: string, cb: () => void) => {
      state.listener = cb;
      return { remove: async () => void state.removed++ };
    }),
    minimizeApp: vi.fn(async () => void state.minimized++),
  },
}));

describe('bouton Retour', () => {
  it('ne fait rien dans un navigateur', async () => {
    const stop = webBack.onBack(() => true);
    expect(() => stop()).not.toThrow();
    await expect(webBack.minimize()).resolves.toBeUndefined();
  });

  it('ferme ce qui est ouvert, sinon met l’app en arrière-plan', async () => {
    const { createNativeBack } = await import('./back');
    const back = createNativeBack();
    let open = true;
    const stop = back.onBack(() => {
      const had = open;
      open = false;
      return had;
    });
    await Promise.resolve();
    state.listener?.();
    expect(state.minimized).toBe(0);
    state.listener?.();
    expect(state.minimized).toBe(1);
    stop();
    await Promise.resolve();
    await Promise.resolve();
    expect(state.removed).toBe(1);
    await back.minimize();
    expect(state.minimized).toBe(2);
  });
});
