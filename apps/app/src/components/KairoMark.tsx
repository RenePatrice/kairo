import { iridescent } from '@kairo/ui';
import { useId } from 'react';

/** Logo Kairo de l'écran Langue : anneau, arc irisé et point « maintenant ». */
export function KairoMark({ size = 110 }: { size?: number }) {
  const id = useId();
  const stops = [0, 0.3, 0.55, 0.78, 1];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      aria-hidden="true"
      className="drop-shadow-[0_0_30px_color-mix(in_oklab,var(--k-acc)_45%,transparent)]"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          {iridescent.map((c, i) => (
            <stop key={c} offset={stops[i]} stopColor={c} />
          ))}
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="68" fill="none" stroke="var(--k-track)" strokeWidth="18" />
      <path
        d="M100 32 A68 68 0 0 1 164.7 121"
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth="18"
        strokeLinecap="round"
      />
      <circle cx="164.7" cy="121" r="11" fill="var(--k-ink)" />
      <circle cx="100" cy="100" r="9" fill={`url(#${id})`} />
    </svg>
  );
}
