/** Données de l'app partagées par contexte (voir DataProvider). */
import type { CheckMap } from '@kairo/core';
import type { Block, Category, Settings } from '@kairo/db';
import { createContext, useContext } from 'react';

export interface AppData {
  settings: Settings;
  categories: Category[];
  blocks: Block[];
  checks: CheckMap;
  restDays: ReadonlySet<string>;
  steps: Readonly<Record<string, readonly number[]>>;
  categoryOf: (id: string) => Category;
}

export const DataContext = createContext<AppData | null>(null);

export function useAppData(): AppData {
  const v = useContext(DataContext);
  if (!v) throw new Error('useAppData doit être utilisé sous <DataProvider>');
  return v;
}
