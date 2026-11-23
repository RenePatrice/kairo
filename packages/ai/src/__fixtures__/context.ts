import type { AssistantContext } from '../context';

/** Lundi 23 novembre 2026, 10 h 30 (Europe/Paris). */
export const MONDAY_1030 = new Date('2026-11-23T10:30:00+01:00');

export const PALETTE = ['#B4A5FF', '#7CB7FF', '#5EE0D2', '#7EE2A8', '#E4F26A', '#FFC861'];

/**
 * Planning d'étudiant : Révisions en semaine le matin, Salle mardi et jeudi soir, Lecture chaque
 * soir. Références vues par le modèle : b1 = Révisions, b2 = Lecture, b3 = Salle.
 */
export function makeContext(overrides: Partial<AssistantContext> = {}): AssistantContext {
  let n = 0;
  return {
    now: MONDAY_1030,
    locale: 'fr',
    rhythm: { wakeMin: 420, sleepMin: 1410 },
    categories: [
      { id: 'c-salle', name: 'Salle', color: '#B4A5FF', weeklyGoalH: 5 },
      { id: 'c-rev', name: 'Révisions', color: '#7CB7FF', weeklyGoalH: 10 },
      { id: 'c-lec', name: 'Lecture', color: '#5EE0D2', weeklyGoalH: 3 },
    ],
    blocks: [
      { id: 'bl-rev', categoryId: 'c-rev', days: [0, 1, 2, 3, 4], startMin: 540, endMin: 720 },
      { id: 'bl-salle', categoryId: 'c-salle', days: [1, 3], startMin: 1080, endMin: 1140 },
      {
        id: 'bl-lec',
        categoryId: 'c-lec',
        days: [0, 1, 2, 3, 4, 5, 6],
        startMin: 1320,
        endMin: 1350,
      },
    ],
    palette: PALETTE,
    newId: () => `id-${++n}`,
    ...overrides,
  };
}
