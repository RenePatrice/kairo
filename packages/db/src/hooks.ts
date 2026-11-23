/** Lecture en direct pour les écrans (requêtes live Dexie). Les écrans ne lisent la base que par ici. */
import type { CheckMap, EnergyMap } from '@kairo/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { createContext, useContext } from 'react';
import type { KairoDB } from './database';
import { readEnergy } from './progress';
import { getSettings, listBlocks, listCategories, readChecks } from './repo';
import type { Block, Category, Goal, Review, Settings } from './schema';

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

export function useEnergy(): EnergyMap | undefined {
  const db = useDb();
  return useLiveQuery(() => readEnergy(db), [db]);
}

/** Objectifs par clé (`D2026-11-23`, `W2026-48`). */
export function useGoals(): Readonly<Record<string, Goal>> | undefined {
  const db = useDb();
  return useLiveQuery(
    async () => Object.fromEntries((await db.goals.toArray()).map((g) => [g.id, g])),
    [db],
  );
}

/** Bilans par clé (`D2026-11-23`, `W2026-48`). */
export function useReviews(): Readonly<Record<string, Review>> | undefined {
  const db = useDb();
  return useLiveQuery(
    async () => Object.fromEntries((await db.reviews.toArray()).map((r) => [r.id, r])),
    [db],
  );
}
