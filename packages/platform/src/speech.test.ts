import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createWebSpeech, type WebRecognition } from './speech';

const native = {
  available: true,
  permission: 'granted',
  afterRequest: 'granted',
  matches: ['Salle mardi 18h-19h'] as string[] | undefined,
  fail: false,
  started: [] as unknown[],
  stopped: 0,
};
vi.mock('@capacitor-community/speech-recognition', () => ({
  SpeechRecognition: {
    available: vi.fn(async () => {
      if (native.fail) throw new Error('absent');
      return { available: native.available };
    }),
    checkPermissions: vi.fn(async () => ({ speechRecognition: native.permission })),
    requestPermissions: vi.fn(async () => ({ speechRecognition: native.afterRequest })),
    start: vi.fn(async (o: unknown) => {
      native.started.push(o);
      if (native.fail) throw new Error('No match');
      return { matches: native.matches };
    }),
    stop: vi.fn(async () => {
      native.stopped++;
      if (native.fail) throw new Error('not listening');
    }),
  },
}));

/** Faux `SpeechRecognition` piloté par le test. */
function fakeCtor(behaviour: 'result' | 'error' | 'silence' | 'throw') {
  const instances: Array<WebRecognition & { stopped: boolean }> = [];
  class Fake implements WebRecognition {
    lang = '';
    interimResults = true;
    maxAlternatives = 5;
    continuous = true;
    onresult: WebRecognition['onresult'] = null;
    onerror: WebRecognition['onerror'] = null;
    onend: WebRecognition['onend'] = null;
    stopped = false;
    constructor() {
      instances.push(this);
    }
    start() {
      if (behaviour === 'throw') throw new Error('déjà en cours');
      queueMicrotask(() => {
        if (behaviour === 'result')
          this.onresult?.({ results: [[{ transcript: ' Piano mercredi 17h30 ' }]] });
        if (behaviour === 'error') this.onerror?.();
        this.onend?.();
      });
    }
    stop() {
      this.stopped = true;
    }
  }
  return { Ctor: Fake, instances };
}

describe('dictée web', () => {
  it('reconnaît une phrase dans la langue de l’app', async () => {
    const { Ctor, instances } = fakeCtor('result');
    const speech = createWebSpeech(Ctor);
    expect(await speech.available()).toBe(true);
    expect(await speech.listen('fr')).toBe('Piano mercredi 17h30');
    expect(instances[0]).toMatchObject({
      lang: 'fr-FR',
      interimResults: false,
      maxAlternatives: 1,
      continuous: false,
    });
    await speech.listen('en');
    expect(instances[1]?.lang).toBe('en-US');
  });

  it('renvoie null sur erreur, silence ou démarrage impossible', async () => {
    expect(await createWebSpeech(fakeCtor('error').Ctor).listen('fr')).toBeNull();
    expect(await createWebSpeech(fakeCtor('silence').Ctor).listen('fr')).toBeNull();
    expect(await createWebSpeech(fakeCtor('throw').Ctor).listen('fr')).toBeNull();
  });

  it('arrête l’écoute en cours', async () => {
    const { Ctor, instances } = fakeCtor('silence');
    const speech = createWebSpeech(Ctor);
    const pending = speech.listen('fr');
    await speech.stop();
    expect(instances[0]?.stopped).toBe(true);
    await pending;
    await expect(speech.stop()).resolves.toBeUndefined();
  });

  it('indisponible sans Web Speech', async () => {
    const speech = createWebSpeech(null);
    expect(await speech.available()).toBe(false);
    expect(await speech.listen('fr')).toBeNull();
  });
});

describe('dictée native', () => {
  beforeEach(() => {
    Object.assign(native, {
      available: true,
      permission: 'granted',
      afterRequest: 'granted',
      matches: ['Salle mardi 18h-19h'],
      fail: false,
      started: [],
      stopped: 0,
    });
  });

  it('écoute avec le plugin, sans fenêtre système', async () => {
    const { createNativeSpeech } = await import('./speech');
    const speech = createNativeSpeech();
    expect(await speech.available()).toBe(true);
    expect(await speech.listen('fr')).toBe('Salle mardi 18h-19h');
    expect(native.started).toEqual([
      { language: 'fr-FR', maxResults: 1, partialResults: false, popup: false },
    ]);
    await speech.stop();
    expect(native.stopped).toBe(1);
  });

  it('demande le micro en contexte et renvoie null s’il est refusé', async () => {
    const { createNativeSpeech } = await import('./speech');
    native.permission = 'prompt';
    native.afterRequest = 'denied';
    expect(await createNativeSpeech().listen('en')).toBeNull();
    expect(native.started).toEqual([]);
    native.afterRequest = 'granted';
    native.matches = undefined;
    expect(await createNativeSpeech().listen('en')).toBeNull();
  });

  it('absorbe les erreurs du plugin', async () => {
    const { createNativeSpeech } = await import('./speech');
    native.fail = true;
    const speech = createNativeSpeech();
    expect(await speech.available()).toBe(false);
    expect(await speech.listen('fr')).toBeNull();
    await expect(speech.stop()).resolves.toBeUndefined();
  });
});
