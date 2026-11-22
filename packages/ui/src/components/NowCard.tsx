import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useAppearance } from '../appearance/context';
import { GlassSurface } from '../glass/GlassSurface';
import { transitionFor } from '../motion/transitions';

export interface NowCardProps {
  /** Créneau en cours ; absent = aucun bloc maintenant. */
  current?: {
    title: string;
    color: string;
    /** « 18:00–19:00 » */
    timeLabel: string;
    /** « 24 min » : temps restant déjà formaté. */
    remainingLabel: string;
    /** 0 → 1, calculé par core.progress. */
    progress: number;
  } | null;
  next?: { title: string; color: string; timeLabel: string } | null;
  className?: string;
}

const RING = 2 * Math.PI * 44;

/**
 * Le moment présent : anneau de progression, compte à rebours et « À suivre ».
 * Deviendra la Live Activity / notification en cours en Phase 3.
 */
export function NowCard({ current, next, className = '' }: NowCardProps) {
  const { t } = useTranslation('ui');
  const { reduceMotion } = useAppearance();

  return (
    <GlassSurface
      as="section"
      level="regular"
      interactive
      aria-label={t('now.label')}
      className={`flex flex-col gap-5 overflow-hidden rounded-panel p-5 ${className}`}
    >
      {current ? (
        <div className="flex items-center gap-5">
          <div className="relative size-28 flex-none">
            <span
              aria-hidden="true"
              className="absolute inset-2 animate-breath rounded-pill"
              style={{ boxShadow: `0 0 36px 4px ${current.color}`, opacity: 0.5 }}
            />
            <svg viewBox="0 0 100 100" className="relative size-full -rotate-90" aria-hidden="true">
              <circle cx="50" cy="50" r="44" fill="none" stroke="var(--k-track)" strokeWidth="8" />
              <motion.circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke={current.color}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={RING}
                initial={false}
                animate={{ strokeDashoffset: RING * (1 - current.progress) }}
                transition={transitionFor('screen', reduceMotion)}
              />
            </svg>
            <span className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="num text-title leading-none">{current.remainingLabel}</span>
            </span>
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="eyebrow" style={{ color: 'var(--k-acc-text)' }}>
              {'// '}
              {t('now.label')}
            </span>
            <span className="truncate num text-display leading-tight">{current.title}</span>
            <span className="mono-num text-small text-ink2">{current.timeLabel}</span>
            <span className="sr-only">{t('now.remaining', { time: current.remainingLabel })}</span>
          </div>
        </div>
      ) : (
        <p className="text-lead text-ink2">{t('now.empty')}</p>
      )}
      <div className="flex items-center gap-3 border-t border-line pt-4">
        <span className="label-mono">{t('now.next')}</span>
        {next ? (
          <span className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden="true"
              className="size-2.5 flex-none rounded-pill"
              style={{ background: next.color, boxShadow: `0 0 8px ${next.color}` }}
            />
            <span className="truncate text-body font-semibold">{next.title}</span>
            <span className="mono-num text-small text-ink3">{next.timeLabel}</span>
          </span>
        ) : (
          <span className="text-small text-ink3">{t('now.noNext')}</span>
        )}
      </div>
    </GlassSurface>
  );
}
