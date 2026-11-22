import { Pressable, type PressableProps } from '../motion/Pressable';

export type ButtonVariant = 'primary' | 'accent' | 'ghost';
export type ButtonSize = 'md' | 'sm';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-inv text-inv-ink',
  accent: 'bg-acc text-acc-ink',
  ghost: 'bg-card text-ink border border-line',
};

const sizes: Record<ButtonSize, string> = {
  md: 'h-13 px-6 text-body',
  sm: 'h-11 px-4 text-small',
};

export interface ButtonProps extends PressableProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/** Bouton capsule de la maquette. Hauteur ≥ 44 px (zone tactile). */
export function Button({ variant = 'primary', size = 'md', className = '', ...rest }: ButtonProps) {
  return (
    <Pressable
      className={`inline-flex items-center justify-center gap-2 rounded-pill font-semibold disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    />
  );
}
