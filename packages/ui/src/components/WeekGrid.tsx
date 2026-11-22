import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { GlassSurface } from '../glass/GlassSurface';
import { TimeBlock, type TimeBlockVariant } from './TimeBlock';

/** Bloc prêt à placer : toutes les valeurs viennent de @kairo/core (aucun calcul d'heure ici). */
export interface GridBlock {
  id: string;
  /** Minute de début relative au minuit du jour (négative pour un débordement de la veille). */
  startMin: number;
  durationMin: number;
  /** Colonne et nombre de colonnes en cas de chevauchement (core.layoutLanes). */
  lane: number;
  lanes: number;
  title: string;
  timeLabel: string;
  color: string;
  ariaLabel: string;
  variant?: TimeBlockVariant;
  onClick?: () => void;
}

export interface DayColumnData {
  id: string;
  /** « LUN » */
  label: string;
  /** « 16 » */
  sublabel?: string;
  /** Nom complet pour les lecteurs d'écran (« lundi 16 novembre »). */
  fullLabel: string;
  isToday?: boolean;
  blocks: GridBlock[];
}

export interface GridWindowProp {
  startMin: number;
  endMin: number;
}

export interface WeekGridProps {
  window: GridWindowProp;
  /** Graduations (core.hourMarks). */
  marks: ReadonlyArray<{ minute: number; label: string }>;
  days: DayColumnData[];
  /** Hauteur d'une heure en px. */
  hourHeight?: number;
  /** Minute actuelle relative au jour d'aujourd'hui, pour la ligne « maintenant ». */
  nowMin?: number | null;
  className?: string;
}

/** Les blocs de moins de 45 min passent en version compacte. */
const COMPACT_UNDER = 45;

/** Le bloc a-t-il une partie visible dans la fenêtre ? */
function isVisible(block: GridBlock, window: GridWindowProp): boolean {
  return block.startMin < window.endMin && block.startMin + block.durationMin > window.startMin;
}

function placement(block: GridBlock, window: GridWindowProp, hourHeight: number): CSSProperties {
  const start = Math.max(block.startMin, window.startMin);
  const end = Math.min(block.startMin + block.durationMin, window.endMin);
  const pxPerMin = hourHeight / 60;
  const width = 100 / block.lanes;
  return {
    position: 'absolute',
    top: (start - window.startMin) * pxPerMin,
    height: Math.max(18, (end - start) * pxPerMin - 2),
    left: `calc(${block.lane * width}% + 2px)`,
    width: `calc(${width}% - 4px)`,
  };
}

export function DayColumn({
  day,
  window,
  hourHeight,
  marks,
  nowMin,
}: {
  day: DayColumnData;
  window: GridWindowProp;
  hourHeight: number;
  marks: WeekGridProps['marks'];
  nowMin?: number | null | undefined;
}) {
  const height = ((window.endMin - window.startMin) / 60) * hourHeight;
  return (
    <section aria-label={day.fullLabel} className="flex min-w-0 flex-col gap-2">
      <GlassSurface
        level="thin"
        as="header"
        className={`sticky top-0 z-10 flex flex-col items-center rounded-chip py-1.5 ${
          day.isToday ? 'text-acc-text' : 'text-ink2'
        }`}
      >
        <span className="label-mono" style={day.isToday ? { color: 'inherit' } : undefined}>
          {day.label}
        </span>
        {day.sublabel ? <span className="num text-lead">{day.sublabel}</span> : null}
      </GlassSurface>
      <div className="relative" style={{ height }}>
        {marks.map((m) => (
          <span
            key={m.minute}
            aria-hidden="true"
            className="absolute inset-x-0 border-t border-line"
            style={{ top: ((m.minute - window.startMin) / 60) * hourHeight }}
          />
        ))}
        <ul className="contents">
          {day.blocks
            .filter((b) => isVisible(b, window))
            .map((b) => (
              <li key={b.id} style={placement(b, window, hourHeight)}>
                <TimeBlock
                  title={b.title}
                  timeLabel={b.timeLabel}
                  color={b.color}
                  ariaLabel={b.ariaLabel}
                  variant={b.variant ?? 'default'}
                  compact={b.durationMin < COMPACT_UNDER}
                  layoutId={`block-${day.id}-${b.id}`}
                  {...(b.onClick ? { onClick: b.onClick } : {})}
                />
              </li>
            ))}
        </ul>
        {day.isToday && nowMin != null && nowMin >= window.startMin && nowMin <= window.endMin ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 z-10 h-0.5 rounded-pill bg-ink"
            style={{
              top: ((nowMin - window.startMin) / 60) * hourHeight,
              boxShadow: '0 0 8px var(--k-ink)',
            }}
          />
        ) : null}
      </div>
    </section>
  );
}

/**
 * Le tableau A3 en version vivante : axe horaire adaptatif + une colonne par jour.
 * Sur petit écran la grille défile horizontalement ; l'écran Semaine (Phase 1) n'affiche
 * qu'un jour à la fois avec la bande des 7 jours.
 */
export function WeekGrid({
  window,
  marks,
  days,
  hourHeight = 48,
  nowMin = null,
  className = '',
}: WeekGridProps) {
  const { t } = useTranslation('ui');
  return (
    <div role="region" aria-label={t('grid.label')} className={`overflow-x-auto ${className}`}>
      <div
        className="grid gap-1.5"
        style={{
          gridTemplateColumns: `2.75rem repeat(${days.length}, minmax(6.5rem, 1fr))`,
        }}
      >
        <div aria-label={t('grid.hours')} className="relative" style={{ marginTop: 52 }}>
          {marks.map((m) => (
            <span
              key={m.minute}
              className="absolute right-1 -translate-y-1/2 mono-num text-micro text-ink3"
              style={{ top: ((m.minute - window.startMin) / 60) * hourHeight }}
            >
              {m.label}
            </span>
          ))}
        </div>
        {days.map((d) => (
          <DayColumn
            key={d.id}
            day={d}
            window={window}
            hourHeight={hourHeight}
            marks={marks}
            nowMin={nowMin}
          />
        ))}
      </div>
    </div>
  );
}
