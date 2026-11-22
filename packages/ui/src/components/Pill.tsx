import type { ReactNode } from 'react';
import { GlassSurface } from '../glass/GlassSurface';

export interface PillProps {
  children: ReactNode;
  /** Couleur du texte (ex. série en abricot). Par défaut : texte secondaire. */
  tone?: 'default' | 'accent' | 'streak' | 'success';
  className?: string;
}

const tones = {
  default: 'text-ink2',
  accent: 'text-acc-text',
  streak: 'text-streak',
  success: 'text-success',
} as const;

/** Puce en verre fin : série, statut, filtre. */
export function Pill({ children, tone = 'default', className = '' }: PillProps) {
  return (
    <GlassSurface
      level="thin"
      as="span"
      className={`inline-flex items-center gap-1.5 rounded-chip px-2.5 py-1 mono-num text-label font-semibold ${tones[tone]} ${className}`}
    >
      {children}
    </GlassSurface>
  );
}
