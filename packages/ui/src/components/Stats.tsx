import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useAppearance } from '../appearance/context';
import { GlassSurface } from '../glass/GlassSurface';
import { transitionFor } from '../motion/transitions';

export interface StatTileProps {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  className?: string;
}

/** Tuile de chiffre clé (repris du tableau A3, en verre). */
export function StatTile({ label, value, unit, hint, className = '' }: StatTileProps) {
  return (
    <GlassSurface level="regular" className={`flex flex-col gap-1 rounded-tile p-4 ${className}`}>
      <span className="label-mono">{label}</span>
      <span className="flex items-baseline gap-1">
        <span className="num text-display leading-none">{value}</span>
        {unit ? <span className="mono-num text-small text-ink2">{unit}</span> : null}
      </span>
      {hint ? <span className="text-caption text-ink3">{hint}</span> : null}
    </GlassSurface>
  );
}

export interface HoursBarItem {
  id: string;
  label: string;
  color: string;
  /** Minutes réalisées et prévues : le ratio sert uniquement à dessiner la barre. */
  doneMin: number;
  plannedMin: number;
  /** « 4,5 h / 6 h », déjà formaté par core. */
  valueLabel: string;
}

/** Heures par activité, réalisé vs prévu. */
export function HoursBar({ items, className = '' }: { items: HoursBarItem[]; className?: string }) {
  const { reduceMotion } = useAppearance();
  return (
    <ul className={`flex flex-col gap-3 ${className}`}>
      {items.map((it) => {
        const ratio = it.plannedMin > 0 ? Math.min(1, it.doneMin / it.plannedMin) : 0;
        return (
          <li key={it.id} className="flex flex-col gap-1.5">
            <span className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-small font-semibold">
                <span
                  aria-hidden="true"
                  className="size-2.5 rounded-pill"
                  style={{ background: it.color }}
                />
                {it.label}
              </span>
              <span className="mono-num text-caption text-ink2">{it.valueLabel}</span>
            </span>
            <span
              role="meter"
              aria-label={it.label}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(ratio * 100)}
              aria-valuetext={it.valueLabel}
              className="block h-2 overflow-hidden rounded-pill bg-track"
            >
              <motion.span
                className="block h-full rounded-pill"
                style={{ background: it.color, boxShadow: `0 0 10px ${it.color}` }}
                initial={{ width: 0 }}
                animate={{ width: `${ratio * 100}%` }}
                transition={transitionFor('screen', reduceMotion)}
              />
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Légende des catégories (la couleur n'est jamais le seul signal : le nom est toujours écrit). */
export function Legend({
  items,
  className = '',
}: {
  items: ReadonlyArray<{ id: string; label: string; color: string }>;
  className?: string;
}) {
  const { t } = useTranslation('ui');
  return (
    <ul aria-label={t('legend.label')} className={`flex flex-wrap gap-2 ${className}`}>
      {items.map((it) => (
        <li key={it.id}>
          <GlassSurface
            level="thin"
            as="span"
            className="inline-flex items-center gap-2 rounded-pill px-3 py-1.5 text-caption font-medium text-ink2"
          >
            <span
              aria-hidden="true"
              className="size-2.5 rounded-pill"
              style={{ background: it.color }}
            />
            {it.label}
          </GlassSurface>
        </li>
      ))}
    </ul>
  );
}

/** Thème du jour (« Mardi · Sécurité web »). */
export function TopicCard({
  eyebrow,
  title,
  body,
  className = '',
}: {
  eyebrow: string;
  title: string;
  body?: string;
  className?: string;
}) {
  return (
    <GlassSurface level="regular" className={`flex flex-col gap-1.5 rounded-card p-4 ${className}`}>
      <span className="eyebrow">{eyebrow}</span>
      <span className="accent-serif text-title leading-tight">{title}</span>
      {body ? <span className="text-small text-ink2">{body}</span> : null}
    </GlassSurface>
  );
}
