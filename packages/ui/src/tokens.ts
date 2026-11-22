/**
 * Source unique du système de design Kairo, reprise de la maquette
 * (docs/design/prototype/Main.dc.html). Couleurs, rayons, polices, ressorts :
 * on ne code jamais ces valeurs ailleurs. Le CSS Tailwind est généré depuis ce fichier
 * (`pnpm --filter @kairo/ui gen:css`).
 */

export const themeNames = ['minuit', 'oled', 'papier'] as const;
export type ThemeName = (typeof themeNames)[number];

export interface ThemeTokens {
  /** Fond de l'application. */
  bg: string;
  /** Fond légèrement relevé (feuilles, notifications). */
  bg2: string;
  /** Texte principal, secondaire, tertiaire (libellés, graduations). */
  ink: string;
  ink2: string;
  ink3: string;
  /** Bordure fine du verre. */
  line: string;
  /** Teinte du verre et son reflet spéculaire (bord haut). */
  card: string;
  cardHi: string;
  /** Surface pleine de repli (« réduire la transparence »). */
  solid: string;
  /** Couleurs inversées : boutons principaux, toasts. */
  inv: string;
  invInk: string;
  /** Voile derrière les feuilles modales. */
  shade: string;
  /** Pistes des jauges et anneaux. */
  track: string;
  /** Opacité des halos d'ambiance. */
  glowOp: number;
  /** Le thème est-il clair (pour la barre d'état, les ombres) ? */
  light: boolean;
}

export const themes: Record<ThemeName, ThemeTokens> = {
  minuit: {
    bg: '#080A14',
    bg2: '#0F1222',
    ink: '#F5F6FB',
    ink2: '#B6BBD0',
    ink3: '#7C83A3',
    line: 'rgba(255,255,255,0.10)',
    card: 'rgba(255,255,255,0.055)',
    cardHi: 'rgba(255,255,255,0.16)',
    solid: '#131729',
    inv: '#F5F6FB',
    invInk: '#0A0C16',
    shade: 'rgba(3,4,10,0.62)',
    track: 'rgba(255,255,255,0.06)',
    glowOp: 0.55,
    light: false,
  },
  oled: {
    bg: '#000000',
    bg2: '#0B0B0D',
    ink: '#FFFFFF',
    ink2: '#A9A9B2',
    ink3: '#80808B',
    line: 'rgba(255,255,255,0.09)',
    card: 'rgba(255,255,255,0.045)',
    cardHi: 'rgba(255,255,255,0.12)',
    solid: '#101012',
    inv: '#FFFFFF',
    invInk: '#000000',
    shade: 'rgba(0,0,0,0.72)',
    track: 'rgba(255,255,255,0.06)',
    glowOp: 0.28,
    light: false,
  },
  papier: {
    bg: '#F2EEE6',
    bg2: '#FBF9F5',
    ink: '#16141B',
    ink2: '#56525F',
    ink3: '#6E6979',
    line: 'rgba(22,20,27,0.10)',
    card: 'rgba(255,255,255,0.62)',
    cardHi: 'rgba(255,255,255,0.95)',
    solid: '#FFFFFF',
    inv: '#16141B',
    invInk: '#F7F4EE',
    shade: 'rgba(40,36,30,0.35)',
    track: 'rgba(22,20,27,0.07)',
    glowOp: 0.3,
    light: true,
  },
};

export const accentNames = ['lav', 'lagon', 'miel', 'corail', 'menthe'] as const;
export type AccentName = (typeof accentNames)[number];

export interface AccentTokens {
  /** Couleur d'accent (marque, focus, éléments validés). */
  acc: string;
  /** Texte posé sur l'accent. */
  accInk: string;
  /** Accent utilisé comme couleur de texte sur le thème clair (assombri pour le contraste). */
  accTextLight: string;
}

export const accents: Record<AccentName, AccentTokens> = {
  lav: { acc: '#B4A5FF', accInk: '#16103A', accTextLight: '#5B49C7' },
  lagon: { acc: '#5EE0D2', accInk: '#032A26', accTextLight: '#16756C' },
  miel: { acc: '#FFC861', accInk: '#2E1E00', accTextLight: '#8A5A00' },
  corail: { acc: '#FF7A85', accInk: '#3A0710', accTextLight: '#B8323F' },
  menthe: { acc: '#7EE2A8', accInk: '#05261A', accTextLight: '#1F7A4A' },
};

/** Les 12 couleurs d'activité (renommables). La clé sert de libellé i18n. */
export const activityPalette = [
  { key: 'lavande', hex: '#B4A5FF' },
  { key: 'azur', hex: '#7CB7FF' },
  { key: 'lagon', hex: '#5EE0D2' },
  { key: 'menthe', hex: '#7EE2A8' },
  { key: 'citron', hex: '#E4F26A' },
  { key: 'miel', hex: '#FFC861' },
  { key: 'abricot', hex: '#FF9F6E' },
  { key: 'corail', hex: '#FF7A85' },
  { key: 'pivoine', hex: '#FF8AD8' },
  { key: 'glycine', hex: '#D29BFF' },
  { key: 'ardoise', hex: '#9AA6C2' },
  { key: 'sable', hex: '#D9C3A0' },
] as const;

/** Texte sombre posé sur les couleurs vives (activités, pastilles). */
export const inkOnColor = { dark: '#0B0D18', light: '#FFFFFF' } as const;

/** Dégradé irisé réservé à l'IA : bouton assistant, contours des propositions fantômes. */
export const iridescent = ['#8FA8FF', '#B79CFF', '#EE9BC6', '#FFC3A0', '#9EE3D2'] as const;

/** Cœur sombre de l'orbe de l'assistant (dégradé radial). */
export const orbCore = ['#2A2F52', '#0B0D18'] as const;

/** Humeurs des bilans, de 1 (difficile) à 5 (top). */
export const moodColors = ['#FF7A85', '#FF9F6E', '#FFC861', '#7EE2A8', '#5EE0D2'] as const;

/** Couleurs de statut. */
export const status = {
  success: '#7EE2A8',
  successInk: '#05261A',
  warning: '#FFC861',
  danger: '#FF7A85',
  streak: '#FFC3A0',
  rest: '#A3D9A5',
} as const;

/**
 * Halos d'ambiance selon le moment de la journée (heure murale de fin exclue, en minutes).
 * Pendant un bloc, le premier halo prend la couleur de son activité.
 */
export const ambientStops = [
  { untilMin: 300, colors: ['#3B3A8F', '#24205C'] }, // nuit
  { untilMin: 540, colors: ['#E8A06A', '#C86B9A'] }, // aube
  { untilMin: 1020, colors: ['#5B8DEF', '#4FB8C4'] }, // journée
  { untilMin: 1260, colors: ['#C46A9E', '#7A5CD6'] }, // soirée
  { untilMin: 1440, colors: ['#5048B8', '#7A5CD6'] }, // nuit
] as const;

/**
 * Matériaux de verre. `thin` et `regular` teintent avec `card` du thème (multiplié par
 * `cardScale`) ; `thick` utilise `bg2` à `bg2Alpha` pour garder le texte lisible
 * (barre de commande, feuilles). Repli : `solid` du thème.
 */
export const glass = {
  thin: { cardScale: 0.8, blur: 16, saturate: 160 },
  regular: { cardScale: 1, blur: 28, saturate: 180 },
  thick: { bg2Alpha: 0.62, bg2AlphaLight: 0.74, blur: 40, saturate: 190 },
} as const;
export type GlassLevel = keyof typeof glass;

export const radii = {
  xs: 4,
  block: 8,
  chip: 14,
  field: 18,
  tile: 22,
  card: 26,
  panel: 30,
  sheet: 34,
  pill: 9999,
} as const;

/** Grille de 4 px. */
export const spaceUnit = 4;

export const fonts = {
  sans: "'Geist Variable', Geist, system-ui, sans-serif",
  mono: "'Geist Mono Variable', 'Geist Mono', ui-monospace, monospace",
  serif: "'Instrument Serif', Georgia, serif",
} as const;

/** Échelle typographique (px). */
export const fontSizes = {
  micro: 10,
  label: 11,
  caption: 12,
  small: 13,
  body: 15,
  input: 16,
  lead: 18,
  title: 22,
  display: 28,
  hero: 34,
} as const;

export const tracking = {
  tight: '-0.045em',
  snug: '-0.03em',
  label: '0.16em',
} as const;

/** Zone tactile minimale (WCAG 2.2 / guides iOS et Android). */
export const touchTarget = 44;

/** Ressorts Motion. */
export const springs = {
  /** Appuis, bascules, petits déplacements. */
  interaction: { type: 'spring', stiffness: 380, damping: 32 },
  /** Changements d'écran, feuilles. */
  screen: { type: 'spring', stiffness: 180, damping: 24 },
  /** Rebond expressif (apparition de toasts, notifications). */
  bouncy: { type: 'spring', stiffness: 520, damping: 22 },
} as const;

/** Durées des animations décoratives en boucle (secondes). */
export const loops = {
  glowDrift: 14,
  iridescentSpin: 6,
  breath: 4,
  morph: 5,
} as const;

/** Points de rupture (px), mobile d'abord. */
export const breakpoints = { tablet: 600, desktop: 1024 } as const;
