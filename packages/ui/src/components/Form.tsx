import { motion } from 'motion/react';
import type { ComponentPropsWithRef, ReactNode } from 'react';
import { useAppearance } from '../appearance/context';
import { GlassSurface } from '../glass/GlassSurface';
import { Pressable, type PressableProps } from '../motion/Pressable';
import { transitionFor } from '../motion/transitions';
import { inkOnColor } from '../tokens';

/**
 * Champ texte de la maquette : 54 px, bord fin, halo d'accent au focus.
 * Accepte une `ref` (React 19) pour donner le focus.
 */
export function Field({ className = '', ...rest }: ComponentPropsWithRef<'input'>) {
  return (
    <input
      className={`h-13.5 w-full rounded-field border border-line bg-card px-4 text-input text-ink outline-none transition-shadow placeholder:text-ink3 focus:border-acc focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--k-acc)_25%,transparent)] ${className}`}
      {...rest}
    />
  );
}

/** Libellé mono en capitales au-dessus d'un champ. */
export function FieldLabel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="label-mono">{label}</span>
      {children}
    </label>
  );
}

/** Bouton rond − / + des réglages d'heure et d'objectif. */
export function Stepper({ className = '', ...rest }: PressableProps) {
  return (
    <Pressable
      haptic
      className={`flex size-11.5 flex-none items-center justify-center rounded-pill border border-line bg-card text-heading text-ink ${className}`}
      {...rest}
    />
  );
}

export interface SwitchRowProps {
  name: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** Ligne de réglage avec interrupteur (rôle « switch »), en verre. */
export function SwitchRow({ name, description, checked, onChange }: SwitchRowProps) {
  const { reduceMotion } = useAppearance();
  return (
    <GlassSurface as="div" className="rounded-tile">
      <Pressable
        haptic
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="flex min-h-16 w-full items-center justify-between gap-3 rounded-tile px-4 py-3 text-left"
      >
        <span className="flex flex-col gap-0.5">
          <span className="text-body font-semibold">{name}</span>
          {description ? <span className="text-caption text-ink3">{description}</span> : null}
        </span>
        <span
          aria-hidden="true"
          className={`relative h-8 w-13 flex-none rounded-pill transition-colors duration-200 ${
            checked ? 'bg-acc' : 'bg-track'
          }`}
        >
          <motion.span
            className="absolute top-0.75 size-6.5 rounded-pill shadow-[0_2px_6px_rgba(0,0,0,0.25)]"
            style={{ background: inkOnColor.light }}
            initial={false}
            animate={{ left: checked ? 23 : 3 }}
            transition={transitionFor('bouncy', reduceMotion)}
          />
        </span>
      </Pressable>
    </GlassSurface>
  );
}
