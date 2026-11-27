import { describe, expect, it, vi } from 'vitest';
import {
  createNativeFocusStatus,
  createNativeVoice,
  createWebVoice,
  webFocusStatus,
  type KairoNativePlugin,
} from './voice';

function fakePlugin() {
  return {
    speak: vi.fn(async () => undefined),
    scheduleVoice: vi.fn(async () => undefined),
    showFocus: vi.fn(async () => undefined),
    hideFocus: vi.fn(async () => undefined),
  } satisfies KairoNativePlugin;
}

describe('voix web', () => {
  it('parle dans la langue de l’app, sans rien programmer', async () => {
    const said: string[] = [];
    const v = createWebVoice({ speak: (text, lang) => void said.push(`${lang}:${text}`) });
    expect(v.background).toBe(false);
    await v.speak('Sport dans 10 minutes.', 'fr');
    await v.speak('Gym in 10 minutes.', 'en');
    await v.schedule([{ id: 1, at: new Date(Date.now() + 1000), text: 'x' }], 'fr');
    expect(said).toEqual(['fr-FR:Sport dans 10 minutes.', 'en-US:Gym in 10 minutes.']);
  });

  it('ne fait rien hors navigateur', async () => {
    await expect(createWebVoice(null).speak('a', 'fr')).resolves.toBeUndefined();
    await expect(webFocusStatus.show({ title: 'a', text: '', endAt: 1 })).resolves.toBeUndefined();
  });
});

describe('voix et minuteur natifs', () => {
  it('programme seulement les annonces à venir, en millisecondes', async () => {
    const plugin = fakePlugin();
    const v = createNativeVoice(plugin);
    expect(v.background).toBe(true);
    const later = new Date(Date.now() + 60_000);
    await v.schedule(
      [
        { id: 1, at: new Date(Date.now() - 1000), text: 'passé' },
        { id: 2, at: later, text: 'Sport dans 10 minutes.' },
      ],
      'fr',
    );
    expect(plugin.scheduleVoice).toHaveBeenCalledWith({
      lang: 'fr-FR',
      items: [{ id: 2, at: later.getTime(), text: 'Sport dans 10 minutes.' }],
    });
    await v.speak('Test', 'en');
    expect(plugin.speak).toHaveBeenCalledWith({ text: 'Test', lang: 'en-US' });
  });

  it('montre et retire le minuteur de focus', async () => {
    const plugin = fakePlugin();
    const s = createNativeFocusStatus(plugin);
    const info = { title: 'Sport · focus', text: 'Fin à 19:00', endAt: 123 };
    await s.show(info);
    await s.hide();
    expect(plugin.showFocus).toHaveBeenCalledWith(info);
    expect(plugin.hideFocus).toHaveBeenCalledOnce();
  });
});
