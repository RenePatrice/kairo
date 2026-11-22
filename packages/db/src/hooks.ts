/** Lecture en direct pour les écrans (requêtes live Dexie). Les écrans ne lisent la base que par ici. */
import type { CheckMap } from '@kairo/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { createContext, useContext } from 'react';
import type { KairoDB } from './database';
import { getSettings, listBlocks, listCategories, readChecks } from './repo';
import type { Block, Category, Settings } from './schema';

export const DbContext = createContext<KairoDB | null>(null);

export function useDb(): KairoDB {
  const db = useContext(DbContext);
  if (!db) throw new Error('useDb doit être utilisé sous <DbContext.Provider>');
  return db;
}

/** `undefined` pendant le premier chargement. */
export function useSettings(): Settings | undefined {
  const db = useDb();
  return useLiveQuery(() => getSettings(db), [db]);
}

export function useCategories(): Category[] | undefined {
  const db = useDb();
  return useLiveQuery(() => listCategories(db), [db]);
}

export function useBlocks(): Block[] | undefined {
  const db = useDb();
  return useLiveQuery(() => listBlocks(db), [db]);
}

export function useChecks(): CheckMap | undefined {
  const db = useDb();
  return useLiveQuery(() => readChecks(db), [db]);
}

export function useRestDays(): ReadonlySet<string> | undefined {
  const db = useDb();
  return useLiveQuery(async () => new Set((await db.restDays.toArray()).map((r) => r.date)), [db]);
}

/** Étapes cochées, par clé `AAAA-MM-JJ|idDuCréneau`. */
export function useStepProgress(): Readonly<Record<string, readonly number[]>> | undefined {
  const db = useDb();
  return useLiveQuery(async () => {
    const out: Record<string, number[]> = {};
    for (const p of await db.stepProgress.toArray()) out[p.id] = p.done;
    return out;
  }, [db]);
}
