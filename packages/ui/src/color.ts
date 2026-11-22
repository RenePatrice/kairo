/** Petits calculs de couleur (WCAG 2.2) pour garantir la lisibilité, y compris sur les couleurs personnalisées. */
import { inkOnColor } from './tokens';

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): Rgb {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(hex.trim());
  if (!m?.[1]) throw new RangeError(`Couleur invalide : ${hex}`);
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** « rgba(r,g,b,a) » à partir d'un hex. */
export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

const channel = (v: number): number => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Rapport de contraste WCAG, de 1 à 21. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Texte le plus lisible (sombre ou blanc) sur une couleur de fond. */
export function inkFor(background: string): string {
  return contrastRatio(background, inkOnColor.dark) >= contrastRatio(background, inkOnColor.light)
    ? inkOnColor.dark
    : inkOnColor.light;
}

/**
 * Éclaircit (f > 0, vers le blanc) ou assombrit (f < 0, vers le noir) une couleur,
 * comme `shade()` de la maquette pour le dégradé des créneaux.
 */
export function shade(hex: string, f: number): string {
  const { r, g, b } = hexToRgb(hex);
  const mix = (v: number) => Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f);
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}
