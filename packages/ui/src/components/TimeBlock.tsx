import { motion } from 'motion/react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppearance } from '../appearance/context';
import { inkFor } from '../color';
import { transitionFor } from '../motion/transitions';

export type TimeBlockVariant = 'default' | 'current' | 'ghost' | 'sleep';

export interface TimeBlockProps {
  title: string;
  /** Horaire déjà formaté par @kairo/core (« 07:30–08:30 »). */
  timeLabel: string;
  /** Couleur de l'activité. */
  color: string;
  note?: string;
  variant?: TimeBlockVariant;
  /** Version courte pour les blocs de moins de 45 min. */
  compact?: boolean;
  /** Libellé complet pour lecteur d'écran (« Sport, de 18 h à 19 h, samedi »). */
  ariaLabel: string;
  onClick?: () => void;
  /** Transition à élément partagé vers la fiche du bloc. */
  layoutId?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Bloc coloré : couleur pleine (lisibilité) avec un fin reflet de verre sur le bord haut.
 * Variantes : en cours (lueur qui respire), fantôme IA (contour irisé), sommeil (rayé).
 */
export function TimeBlock({
  title,
  timeLabel,
  color,
  note,
  variant = 'default',
  compact = false,
  ariaLabel,
  onClick,
  layoutId,
  className = '',
  style,
}: TimeBlockProps) {
  const { t } = useTranslation('ui');
  const { reduceMotion } = useAppearance();
  const suffix =
    variant === 'current'
      ? `, ${t('block.current')}`
      : variant === 'ghost'
        ? `, ${t('block.ghost')}`
        : '';

  const filled = variant === 'default' || variant === 'current';
  const surface: CSSProperties = filled
    ? {
        background: color,
        color: inkFor(color),
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -1px 0 rgba(0,0,0,0.08)',
      }
    : {};

  const content = (
    <>
      {variant === 'current' ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-1 -z-10 animate-breath rounded-[12px]"
          style={{ boxShadow: `0 0 22px 2px ${color}` }}
        />
      ) : null}
      {variant === 'ghost' ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 animate-spin-iri iridescent rounded-[inherit] p-[1.5px]"
        >
          <span className="block h-full w-full rounded-[7px] bg-bg2/85" />
        </span>
      ) : null}
      {/* Bouton : le nom accessible vient de ce texte (contenu visible masqué aux lecteurs d'écran). */}
      {onClick ? <span className="sr-only">{`${ariaLabel}${suffix}`}</span> : null}
      <span
        aria-hidden={onClick ? true : undefined}
        className={`flex min-w-0 ${compact ? 'items-center gap-2' : 'flex-col gap-0.5'}`}
      >
        <span className="truncate text-small font-semibold leading-tight">{title}</span>
        <span className="mono-num text-micro opacity-80">{timeLabel}</span>
        {note && !compact ? <span className="truncate text-micro opacity-70">{note}</span> : null}
      </span>
    </>
  );

  const classes = [
    'relative isolate flex h-full w-full rounded-block px-2.5 text-left',
    compact ? 'items-center py-1' : 'items-start py-2',
    variant === 'ghost' ? 'text-ink' : '',
    variant === 'sleep' ? 'stripes bg-solid text-ink2' : '',
    className,
  ].join(' ');

  const common = {
    layoutId,
    className: classes,
    style: { ...surface, ...style },
    'data-variant': variant,
    transition: transitionFor('interaction', reduceMotion),
  };

  return onClick ? (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={reduceMotion ? undefined : { scale: 0.97 }}
      {...common}
    >
      {content}
    </motion.button>
  ) : (
    <motion.div role="group" aria-label={`${ariaLabel}${suffix}`} {...common}>
      {content}
    </motion.div>
  );
}
