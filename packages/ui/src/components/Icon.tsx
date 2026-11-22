import { icons, type IconName } from './icons';

export function Icon({
  name,
  size = 22,
  className = '',
  color,
  filled = false,
}: {
  name: IconName;
  size?: number;
  className?: string;
  /** Couleur du trait (par défaut la couleur du texte). */
  color?: string;
  /** Forme pleine (lecture). */
  filled?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? (color ?? 'currentColor') : 'none'}
      stroke={color ?? 'currentColor'}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d={icons[name]} />
    </svg>
  );
}
