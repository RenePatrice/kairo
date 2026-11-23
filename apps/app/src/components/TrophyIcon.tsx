import type { TrophyId } from '@kairo/core';

/** Pictogrammes des trophées, repris de la maquette (24 × 24). */
const FLAME = 'M12 3c2 4 6 5 6 10a6 6 0 1 1-12 0c0-3 2-4 2-7 2 1 3 3 4 5';
const CLOCK = 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM12 7v5l3 2';
const TROPHY_ICONS: Record<TrophyId, string> = {
  first: 'M5 12l4 4L19 6',
  streak3: FLAME,
  streak7: FLAME,
  streak30: FLAME,
  perfectDay: 'M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.6 6.7 19.4l1.2-6L3.4 9.3l6-.7z',
  goalWeek: 'M4 20V4M4 4h12l-2 4 2 4H4',
  h10: CLOCK,
  h50: CLOCK,
  h100: CLOCK,
  focus5: 'M12 5a7 7 0 1 0 0 14a7 7 0 1 0 0-14zM12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6z',
  reviewer: 'M5 4h11l3 3v13H5zM9 10h6M9 14h6',
  early: 'M12 4v2M4 12H2M22 12h-2M5 5l1.5 1.5M19 5l-1.5 1.5M7 16a5 5 0 0 1 10 0M3 20h18',
  night: 'M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10z',
  rest: 'M4 18c4-1 6-4 8-10 2 6 4 9 8 10',
};

export function TrophyIcon({ id, size = 24 }: { id: TrophyId; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={TROPHY_ICONS[id]} />
    </svg>
  );
}
