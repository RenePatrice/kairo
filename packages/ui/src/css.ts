/**
 * Transforme tokens.ts en CSS pour Tailwind v4. Le résultat est écrit dans
 * src/styles/tokens.css par `pnpm --filter @kairo/ui gen:css` ; un test vérifie qu'il est à jour.
 */
import { withAlpha } from './color';
import {
  accents,
  activityPalette,
  breakpoints,
  fontSizes,
  fonts,
  glass,
  iridescent,
  moodColors,
  radii,
  spaceUnit,
  status,
  themes,
  tracking,
  type ThemeTokens,
} from './tokens';

const kebab = (s: string): string => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** Multiplie l'opacité d'une couleur rgba(). */
export function scaleAlpha(rgba: string, factor: number): string {
  const m = /^rgba\((\d+),(\d+),(\d+),([\d.]+)\)$/.exec(rgba.replace(/\s/g, ''));
  if (!m) throw new RangeError(`rgba() attendu : ${rgba}`);
  const alpha = Math.round(Number(m[4]) * factor * 1000) / 1000;
  return `rgba(${m[1]},${m[2]},${m[3]},${alpha})`;
}

const THEME_VARS: Array<keyof ThemeTokens> = [
  'bg',
  'bg2',
  'ink',
  'ink2',
  'ink3',
  'line',
  'card',
  'cardHi',
  'solid',
  'inv',
  'invInk',
  'shade',
  'track',
];

function themeBlock(name: string, t: ThemeTokens): string {
  const lines = THEME_VARS.map((k) => `  --k-${kebab(k)}: ${String(t[k])};`);
  lines.push(`  --k-glow-op: ${t.glowOp};`);
  lines.push(`  --k-glass-thin: ${scaleAlpha(t.card, glass.thin.cardScale)};`);
  lines.push(`  --k-glass-regular: ${scaleAlpha(t.card, glass.regular.cardScale)};`);
  lines.push(
    `  --k-glass-thick: ${withAlpha(t.bg2, t.light ? glass.thick.bg2AlphaLight : glass.thick.bg2Alpha)};`,
  );
  lines.push(`  color-scheme: ${t.light ? 'light' : 'dark'};`);
  return `.theme-${name} {\n${lines.join('\n')}\n}`;
}

export function buildTokensCss(): string {
  const theme: string[] = [
    `  --font-sans: ${fonts.sans};`,
    `  --font-mono: ${fonts.mono};`,
    `  --font-serif: ${fonts.serif};`,
    `  --spacing: ${spaceUnit / 16}rem;`,
    ...Object.entries(radii).map(([k, v]) => `  --radius-${k}: ${v}px;`),
    ...Object.entries(fontSizes).map(([k, v]) => `  --text-${k}: ${v / 16}rem;`),
    ...Object.entries(tracking).map(([k, v]) => `  --tracking-${k}: ${v};`),
    ...Object.entries(breakpoints).map(([k, v]) => `  --breakpoint-${k}: ${v / 16}rem;`),
    ...activityPalette.map((c) => `  --color-act-${c.key}: ${c.hex};`),
    ...moodColors.map((c, i) => `  --color-mood-${i + 1}: ${c};`),
    ...Object.entries(status).map(([k, v]) => `  --color-${kebab(k)}: ${v};`),
  ];

  const inline = [
    ...THEME_VARS.map((k) => `  --color-${kebab(k)}: var(--k-${kebab(k)});`),
    '  --color-acc: var(--k-acc);',
    '  --color-acc-ink: var(--k-acc-ink);',
    '  --color-acc-text: var(--k-acc-text);',
  ];

  const glassVars = Object.entries(glass).map(
    ([k, g]) => `  --k-glass-${k}-filter: blur(${g.blur}px) saturate(${g.saturate}%);`,
  );
  const stops = iridescent.map((c, i) => `${c} ${Math.round((i / iridescent.length) * 100)}%`);
  glassVars.push(`  --k-iridescent: ${[...stops, `${iridescent[0]} 100%`].join(', ')};`);

  const accentBlocks = Object.entries(accents).map(
    ([k, a]) =>
      `.accent-${k} {\n  --k-acc: ${a.acc};\n  --k-acc-ink: ${a.accInk};\n  --k-acc-text: ${a.acc};\n}\n` +
      `.theme-papier.accent-${k} {\n  --k-acc-text: ${a.accTextLight};\n}`,
  );

  return [
    '/* Généré depuis src/tokens.ts par `pnpm --filter @kairo/ui gen:css`. Ne pas modifier à la main. */',
    `@theme {\n${theme.join('\n')}\n}`,
    `@theme inline {\n${inline.join('\n')}\n}`,
    `:root {\n${glassVars.join('\n')}\n}`,
    ...Object.entries(themes).map(([k, t]) => themeBlock(k, t)),
    ...accentBlocks,
    '',
  ].join('\n\n');
}
