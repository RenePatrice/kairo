/**
 * Enregistrer un fichier texte (sauvegarde JSON). Navigateur : téléchargement. APK et app iOS :
 * le fichier est écrit dans le cache de l'app puis proposé dans le menu Partager du système
 * (Drive, mail, Fichiers…), car une WebView ne sait pas télécharger.
 * La lecture d'un fichier passe par un simple <input type="file">, géré par Capacitor.
 */
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import type { Files, SaveResult } from './types';

export interface WebDownloadEnv {
  download(name: string, text: string, mime: string): void;
}

function defaultDownload(): WebDownloadEnv | null {
  if (typeof document === 'undefined') return null;
  return {
    download: (name, text, mime) => {
      const url = URL.createObjectURL(new Blob([text], { type: mime }));
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.rel = 'noopener';
      document.body.append(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
  };
}

export function createWebFiles(env: WebDownloadEnv | null = defaultDownload()): Files {
  return {
    saveText: (name, text, mime = 'application/json') => {
      if (!env) return Promise.resolve<SaveResult>('failed');
      env.download(name, text, mime);
      return Promise.resolve<SaveResult>('saved');
    },
  };
}

export function createNativeFiles(): Files {
  return {
    saveText: async (name, text, _mime, title) => {
      try {
        const { uri } = await Filesystem.writeFile({
          path: name,
          data: text,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });
        await Share.share({ title, dialogTitle: title, files: [uri] });
        return 'shared';
      } catch (e) {
        // Fermer le menu Partager sans choisir d'application n'est pas une erreur.
        return e instanceof Error && /cancel/i.test(e.message) ? 'cancelled' : 'failed';
      }
    },
  };
}
