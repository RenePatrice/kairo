/**
 * Charge les données de l'app en direct depuis @kairo/db et les partage par contexte,
 * pour que chaque écran n'ouvre pas ses propres requêtes.
 */
import {
  useBlocks,
  useCategories,
  useChecks,
  useRestDays,
  useSettings,
  useStepProgress,
  type Category,
} from '@kairo/db';
import { useMemo, type ReactNode } from 'react';
import { DataContext, type AppData } from './data';

const UNKNOWN: Category = {
  id: '',
  name: '?',
  color: '#9AA6C2',
  weeklyGoalH: 0,
  order: 0,
  updatedAt: '',
  deleted: 0,
};

/** Charge toutes les données ; rend `fallback` tant que la base n'a pas répondu. */
export function DataProvider({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const settings = useSettings();
  const categories = useCategories();
  const blocks = useBlocks();
  const checks = useChecks();
  const restDays = useRestDays();
  const steps = useStepProgress();

  const value = useMemo<AppData | null>(() => {
    if (!settings || !categories || !blocks || !checks || !restDays || !steps) return null;
    const byId = new Map(categories.map((c) => [c.id, c]));
    return {
      settings,
      categories,
      // Un créneau dont l'activité a été supprimée n'est plus affiché.
      blocks: blocks.filter((b) => byId.has(b.categoryId)),
      checks,
      restDays,
      steps,
      categoryOf: (id) => byId.get(id) ?? UNKNOWN,
    };
  }, [settings, categories, blocks, checks, restDays, steps]);

  if (!value) return <>{fallback}</>;
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
