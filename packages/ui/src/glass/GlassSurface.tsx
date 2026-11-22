import {
  createElement,
  useCallback,
  type CSSProperties,
  type HTMLAttributes,
  type PointerEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { useAppearance } from '../appearance/context';
import { glass as glassTokens, type GlassLevel } from '../tokens';

type SurfaceTag =
  'div' | 'span' | 'section' | 'nav' | 'aside' | 'header' | 'footer' | 'article' | 'dialog';

export interface GlassSurfaceProps extends HTMLAttributes<HTMLElement> {
  /** thin : puces, en-têtes · regular : cartes, barre d'onglets · thick : barre IA, feuilles. */
  level?: GlassLevel;
  as?: SurfaceTag;
  /** Reflet spéculaire qui suit le pointeur (verre complet uniquement). */
  interactive?: boolean;
  ref?: Ref<HTMLElement>;
  children?: ReactNode;
}

/**
 * Primitive de verre liquide. Toute surface flottante l'utilise : jamais de fond opaque codé à la main.
 * Repli automatique en surface pleine (« réduire la transparence », appareil sans flou).
 */
export function GlassSurface({
  level = 'regular',
  as = 'div',
  interactive = false,
  className = '',
  style,
  children,
  onPointerMove,
  onPointerLeave,
  ...rest
}: GlassSurfaceProps) {
  const { glass: quality, refractionId } = useAppearance();
  const isGlass = quality !== 'solid';
  const tracksPointer = interactive && quality === 'full';

  const handleMove = useCallback(
    (e: PointerEvent<HTMLElement>) => {
      onPointerMove?.(e);
      if (!tracksPointer) return;
      const r = e.currentTarget.getBoundingClientRect();
      e.currentTarget.style.setProperty('--k-spec-x', `${((e.clientX - r.left) / r.width) * 100}%`);
      e.currentTarget.style.setProperty('--k-spec-y', `${((e.clientY - r.top) / r.height) * 100}%`);
    },
    [onPointerMove, tracksPointer],
  );

  const handleLeave = useCallback(
    (e: PointerEvent<HTMLElement>) => {
      onPointerLeave?.(e);
      e.currentTarget.style.removeProperty('--k-spec-x');
      e.currentTarget.style.removeProperty('--k-spec-y');
    },
    [onPointerLeave],
  );

  const filter =
    quality === 'full' && level !== 'thin' && refractionId
      ? `url(#${refractionId}) var(--k-glass-${level}-filter)`
      : `var(--k-glass-${level}-filter)`;

  const surfaceStyle: CSSProperties = isGlass
    ? {
        background: `var(--k-glass-${level})`,
        backdropFilter: filter,
        WebkitBackdropFilter: `var(--k-glass-${level}-filter)`,
        ...style,
      }
    : { background: 'var(--k-solid)', ...style };

  return createElement(
    as,
    {
      ...rest,
      'data-glass': isGlass ? level : 'solid',
      className: `relative isolate border border-line shadow-[inset_0_1px_0_var(--k-card-hi)] ${className}`,
      style: surfaceStyle,
      onPointerMove: handleMove,
      onPointerLeave: handleLeave,
    },
    isGlass ? (
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit]"
        style={{
          background: `radial-gradient(120% 80% at var(--k-spec-x, 30%) var(--k-spec-y, 0%), var(--k-card-hi), transparent ${
            level === 'thick' ? 55 : 65
          }%)`,
          opacity: glassTokens[level].blur > 20 ? 0.55 : 0.4,
        }}
      />
    ) : null,
    children,
  );
}
