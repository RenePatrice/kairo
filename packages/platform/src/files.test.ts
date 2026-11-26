import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createWebFiles } from './files';

const native = {
  written: [] as unknown[],
  shared: [] as unknown[],
  shareError: null as Error | null,
};
vi.mock('@capacitor/filesystem', () => ({
  Directory: { Cache: 'CACHE' },
  Encoding: { UTF8: 'utf8' },
  Filesystem: {
    writeFile: vi.fn(async (o: { path: string }) => {
      native.written.push(o);
      return { uri: `file:///cache/${o.path}` };
    }),
  },
}));
vi.mock('@capacitor/share', () => ({
  Share: {
    share: vi.fn(async (o: unknown) => {
      if (native.shareError) throw native.shareError;
      native.shared.push(o);
      return {};
    }),
  },
}));

describe('fichiers web', () => {
  it('télécharge le fichier', async () => {
    const download = vi.fn();
    expect(await createWebFiles({ download }).saveText('kairo.json', '{}')).toBe('saved');
    expect(download).toHaveBeenCalledWith('kairo.json', '{}', 'application/json');
  });

  it('échoue proprement hors navigateur', async () => {
    expect(await createWebFiles(null).saveText('kairo.json', '{}')).toBe('failed');
  });
});

describe('fichiers natifs', () => {
  beforeEach(() => {
    native.written = [];
    native.shared = [];
    native.shareError = null;
  });

  it('écrit dans le cache puis ouvre le menu Partager', async () => {
    const { createNativeFiles } = await import('./files');
    const result = await createNativeFiles().saveText(
      'kairo.json',
      '{"a":1}',
      'application/json',
      'Sauvegarde',
    );
    expect(result).toBe('shared');
    expect(native.written).toEqual([
      { path: 'kairo.json', data: '{"a":1}', directory: 'CACHE', encoding: 'utf8' },
    ]);
    expect(native.shared).toEqual([
      { title: 'Sauvegarde', dialogTitle: 'Sauvegarde', files: ['file:///cache/kairo.json'] },
    ]);
  });

  it('distingue l’annulation d’un échec', async () => {
    const { createNativeFiles } = await import('./files');
    native.shareError = new Error('Share canceled');
    expect(await createNativeFiles().saveText('k.json', '{}')).toBe('cancelled');
    native.shareError = new Error('No app');
    expect(await createNativeFiles().saveText('k.json', '{}')).toBe('failed');
  });
});
