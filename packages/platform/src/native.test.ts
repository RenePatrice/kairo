import { describe, expect, it, vi } from 'vitest';

const calls: string[] = [];
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: vi.fn(() => true), getPlatform: vi.fn(() => 'android') },
  registerPlugin: vi.fn(() => ({})),
}));
vi.mock('@capacitor/haptics', () => ({
  ImpactStyle: { Light: 'LIGHT', Medium: 'MEDIUM', Heavy: 'HEAVY' },
  NotificationType: { Success: 'SUCCESS', Warning: 'WARNING', Error: 'ERROR' },
  Haptics: {
    impact: vi.fn(async (o: { style: string }) => void calls.push(`impact:${o.style}`)),
    notification: vi.fn(async (o: { type: string }) => void calls.push(`notify:${o.type}`)),
    selectionStart: vi.fn(async () => void calls.push('start')),
    selectionChanged: vi.fn(async () => void calls.push('changed')),
    selectionEnd: vi.fn(async () => void calls.push('end')),
  },
}));

vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: {} }));
vi.mock('@capacitor-community/speech-recognition', () => ({ SpeechRecognition: {} }));
vi.mock('@capacitor/filesystem', () => ({ Filesystem: {}, Directory: {}, Encoding: {} }));
vi.mock('@capacitor/share', () => ({ Share: {} }));
vi.mock('@capacitor/app', () => ({ App: {} }));

describe('plateforme native', () => {
  it('utilise les plugins Capacitor sur Android', async () => {
    const { detectPlatform } = await import('./native');
    const p = detectPlatform();
    expect(p.kind).toBe('android');
    expect(p.notifications.background).toBe(true);
    expect(p.voice.background).toBe(true);
    await p.haptics.impact('heavy');
    await p.haptics.notify('success');
    await p.haptics.selection();
    expect(calls).toEqual(['impact:HEAVY', 'notify:SUCCESS', 'start', 'changed', 'end']);
  });
});
