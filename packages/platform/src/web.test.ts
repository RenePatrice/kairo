import { describe, expect, it, vi } from 'vitest';
import { VIBRATION_PATTERNS, createWebHaptics, createWebPlatform, silentHaptics } from './web';

describe('createWebHaptics', () => {
  it('traduit chaque retour en motif de vibration', async () => {
    const vibrate = vi.fn(() => true);
    const h = createWebHaptics(vibrate);
    await h.impact();
    await h.impact('heavy');
    await h.notify('success');
    await h.selection();
    expect(vibrate.mock.calls).toEqual([
      [VIBRATION_PATTERNS.impact.light],
      [VIBRATION_PATTERNS.impact.heavy],
      [VIBRATION_PATTERNS.notify.success],
      [VIBRATION_PATTERNS.selection],
    ]);
  });
  it('ne fait rien sans support de la vibration', async () => {
    await expect(createWebHaptics(null).notify('error')).resolves.toBeUndefined();
  });
});

describe('createWebPlatform / silentHaptics', () => {
  it('expose la plateforme web et une haptique muette', async () => {
    expect(createWebPlatform().kind).toBe('web');
    await expect(silentHaptics.impact()).resolves.toBeUndefined();
    await expect(silentHaptics.notify('warning')).resolves.toBeUndefined();
    await expect(silentHaptics.selection()).resolves.toBeUndefined();
  });
});
