/**
 * Filtre SVG de réfraction utilisé dans `backdrop-filter: url(#id)` (Chromium uniquement).
 * Un bruit très doux déplace légèrement les pixels de l'arrière-plan : effet « verre liquide ».
 */
export function RefractionFilter({ id }: { id: string }) {
  return (
    <svg aria-hidden="true" focusable="false" width="0" height="0" style={{ position: 'absolute' }}>
      <filter id={id} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.009 0.012"
          numOctaves={2}
          seed={7}
          result="noise"
        />
        <feGaussianBlur in="noise" stdDeviation="2" result="soft" />
        <feDisplacementMap
          in="SourceGraphic"
          in2="soft"
          scale={14}
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </svg>
  );
}
