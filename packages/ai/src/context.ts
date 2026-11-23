/**
 * Ce que l'assistant sait du planning. Seuls les noms d'activités, jours et horaires sortent
 * de l'appareil : jamais les notes ni les étapes (règle de confidentialité du cahier).
 */
import { durationMin, type Locale, type Rhythm, type Slot } from '@kairo/core';

export interface AssistantCategory {
  id: string;
  name: string;
  color: string;
  weeklyGoalH: number;
}

export interface AssistantBlock extends Slot {
  categoryId: string;
}

export interface AssistantContext {
  now: Date;
  locale: Locale;
  rhythm: Rhythm;
  categories: readonly AssistantCategory[];
  blocks: readonly AssistantBlock[];
  /** Couleurs proposées aux nouvelles activités (palette de tokens.ts). */
  palette: readonly string[];
  /** Fabrique d'identifiants (UUID v7 côté app). */
  newId: () => string;
}

/** Créneau tel que le modèle le voit : `b1`, `b2`… au lieu des identifiants. */
export interface RefBlock {
  ref: string;
  block: AssistantBlock;
  category: AssistantCategory | undefined;
}

/** Ordre stable (premier jour, puis heure) pour que b1, b2… ne bougent pas d'un appel à l'autre. */
export function refBlocks(ctx: Pick<AssistantContext, 'blocks' | 'categories'>): RefBlock[] {
  const firstDay = (b: AssistantBlock) => (b.once ? 7 : Math.min(7, ...b.days));
  return [...ctx.blocks]
    .sort(
      (a, b) => firstDay(a) - firstDay(b) || a.startMin - b.startMin || a.id.localeCompare(b.id),
    )
    .map((block, i) => ({
      ref: `b${i + 1}`,
      block,
      category: ctx.categories.find((c) => c.id === block.categoryId),
    }));
}

export function findCategoryByName(
  categories: readonly AssistantCategory[],
  name: string,
): AssistantCategory | undefined {
  const key = name.trim().toLocaleLowerCase();
  return categories.find((c) => c.name.trim().toLocaleLowerCase() === key);
}

/** Première activité citée dans la phrase (comme la maquette : simple inclusion du nom). */
export function categoryInText(
  categories: readonly AssistantCategory[],
  text: string,
): AssistantCategory | undefined {
  const t = text.toLocaleLowerCase();
  return categories.find((c) => c.name.trim() && t.includes(c.name.trim().toLocaleLowerCase()));
}

/** Durée habituelle d'une activité (son premier créneau), pour chercher un moment libre. */
export function usualLength(
  ctx: Pick<AssistantContext, 'blocks'>,
  categoryId: string,
): number | null {
  const b = ctx.blocks.find((x) => x.categoryId === categoryId);
  return b ? durationMin(b.startMin, b.endMin) : null;
}
