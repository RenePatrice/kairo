/** Icônes au trait de la maquette (24 × 24, trait 1,8). */
export const icons = {
  today: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM12 7v5l3 2',
  week: 'M6 4v16M10 7v13M14 4v16M18 9v11',
  stats: 'M4 19l5-6 4 3 7-9M15 7h5v5',
  me: 'M12 4a4 4 0 1 0 0 8a4 4 0 1 0 0-8zM5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5',
  sparkle:
    'M12 3l1.8 4.6L18 9.4l-4.2 1.8L12 16l-1.8-4.8L6 9.4l4.2-1.8zM19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z',
  mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
  send: 'M5 12h14M13 6l6 6-6 6',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12l4 4L19 6',
  moon: 'M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10z',
} as const;

export type IconName = keyof typeof icons;
