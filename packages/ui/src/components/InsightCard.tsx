import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';

export interface InsightCardProps {
  title?: string;
  /** L'IA explique toujours sa proposition en une phrase. */
  body: string;
  /** Mini-graphique généré (facultatif). */
  chart?: ReactNode;
  onApply?: () => void;
  onDismiss?: () => void;
  applyLabel?: string;
  dismissLabel?: string;
  className?: string;
}

/**
 * Carte générée par l'IA : contour irisé qui tourne, texte, mini-graphique,
 * et toujours un choix explicite « Appliquer / Ignorer ».
 */
export function InsightCard({
  title,
  body,
  chart,
  onApply,
  onDismiss,
  applyLabel,
  dismissLabel,
  className = '',
}: InsightCardProps) {
  const { t } = useTranslation('ui');
  return (
    <article className={`relative rounded-card p-[1.5px] ${className}`}>
      <span
        aria-hidden="true"
        className="absolute inset-0 animate-spin-iri rounded-card iridescent opacity-70"
      />
      <div className="relative flex flex-col gap-3 rounded-[25px] bg-bg2 p-4">
        <span className="eyebrow" style={{ color: 'var(--k-acc-text)' }}>
          {t('insight.badge')}
        </span>
        {title ? <h3 className="m-0 text-lead font-semibold tracking-snug">{title}</h3> : null}
        <p className="m-0 text-body leading-relaxed text-ink2">{body}</p>
        {chart ? <div aria-hidden="true">{chart}</div> : null}
        {onApply || onDismiss ? (
          <div className="flex gap-2">
            {onApply ? (
              <Button size="sm" className="flex-1" onClick={onApply}>
                {applyLabel ?? t('common.apply')}
              </Button>
            ) : null}
            {onDismiss ? (
              <Button size="sm" variant="ghost" className="flex-1" onClick={onDismiss}>
                {dismissLabel ?? t('common.dismiss')}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
