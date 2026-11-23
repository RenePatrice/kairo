/**
 * Moteur de règles de l'assistant, repris de la maquette (`reply` et `parseAsk`). Instantané,
 * hors ligne et gratuit : il traite les demandes simples (« Salle mardi 18h-19h », « mes moments
 * libres », « fais le bilan de ma journée »). Ce qu'il ne sait pas faire part vers Llama.
 */
import { MINUTES_PER_DAY, findClockTimes, isoWeekday, addDays } from '@kairo/core';
import { categoryInText, usualLength, type AssistantContext } from './context';

export type RuleIntent =
  | { intent: 'free_time'; categoryId: string | null; length: number }
  | { intent: 'analysis' }
  | { intent: 'day_review' }
  | { intent: 'stats' }
  | { intent: 'need_time'; categoryId: string | null }
  | {
      intent: 'plan';
      days: number[];
      startMin: number;
      endMin: number;
      categoryId: string | null;
      /** Nom d'une nouvelle activité repérée dans la phrase (si aucune n'existe). */
      newName: string | null;
    }
  /** Demande trop riche pour les règles (« construis-moi une semaine… ») : réservée à Llama. */
  | { intent: 'needs_model' };

const FREE_RE = /libre|dispo|trou|place|free|available|gap/;
const ANALYSIS_RE = /analyse|ma semaine|tendance|progr|analy|my week|trend/;
const DAY_REVIEW_RE = /bilan|journée|journee|aujourd|review|my day|today/;
const STATS_RE = /combien|bilan|stat|progress|résumé|resume|how many|summary|review my week/;
/** Verbes de composition, déplacement ou suppression : au-delà de ce que savent les règles. */
const MODEL_RE =
  /constru|organis|génèr|gener|prépar|prepar|compose|build|create|replani|reschedul|déplac|deplac|décal|decal|move|supprim|retir|enlève|enleve|delete|remove|cancel|annule/;

const DAY_WORDS: Record<string, number> = {
  lundi: 0,
  mardi: 1,
  mercredi: 2,
  jeudi: 3,
  vendredi: 4,
  samedi: 5,
  dimanche: 6,
  monday: 0,
  tuesday: 1,
  wednesday: 2,
  thursday: 3,
  friday: 4,
  saturday: 5,
  sunday: 6,
};

const STOP_RE =
  /\b(le|les|du|au|chaque|tous|toutes|à|a|en|on|every|at|from|to|and|daily|tomorrow|today|demain|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|monday|tuesday|wednesday|thursday|friday|saturday|sunday|semaine|week|weekdays|weekends?|matin|soir|midi|et|\d)/;
const VERB_RE =
  /^(ajoute|ajouter|programme|planifie|mets|cale|prévois|prevois|je veux|je fais|fais|add|schedule|plan|put|book)\s+/;
const ARTICLE_RE = /^(du|de la|de l'|des|un|une|le|la|les|mon|ma|mes|some|a|an|the|my)\s+/;

/** Jours cités : noms de jours, « tous les jours », « en semaine », « le week-end », « demain ». */
export function daysInText(text: string, now: Date): number[] {
  const t = text.toLowerCase();
  let days = Object.entries(DAY_WORDS)
    .filter(([word]) => t.includes(word))
    .map(([, d]) => d);
  if (/tous les jours|chaque jour|quotidien|every day|daily/.test(t)) days = [0, 1, 2, 3, 4, 5, 6];
  if (/en semaine|du lundi au vendredi|weekdays/.test(t)) days = [0, 1, 2, 3, 4];
  if (/week-end|weekend/.test(t)) days = [...days, 5, 6];
  if (!days.length && /demain|tomorrow/.test(t)) days = [isoWeekday(addDays(now, 1))];
  return [...new Set(days)].sort((a, b) => a - b);
}

/** Nom d'une nouvelle activité : la phrase sans le verbe, l'article et ce qui suit le premier mot vide. */
export function newActivityName(text: string): string | null {
  const cleaned = text.toLowerCase().trim().replace(VERB_RE, '').replace(ARTICLE_RE, '');
  const idx = cleaned.search(STOP_RE);
  const raw = (idx > 0 ? cleaned.slice(0, idx) : (cleaned.split(' ')[0] ?? '')).trim();
  if (raw.length < 2) return null;
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function parseRequest(text: string, ctx: AssistantContext): RuleIntent {
  const t = text.toLowerCase();
  const times = findClockTimes(t);
  const hasTime = times.length > 0;
  const category = categoryInText(ctx.categories, t);

  if (MODEL_RE.test(t) || times.length > 2) return { intent: 'needs_model' };

  if (FREE_RE.test(t) && !hasTime) {
    const usual = category ? usualLength(ctx, category.id) : null;
    const length = category ? Math.min(120, Math.max(30, usual ?? 60)) : 45;
    return { intent: 'free_time', categoryId: category?.id ?? null, length };
  }
  if (ANALYSIS_RE.test(t) && !hasTime) return { intent: 'analysis' };
  if (DAY_REVIEW_RE.test(t) && !hasTime) return { intent: 'day_review' };
  if (STATS_RE.test(t)) return { intent: 'stats' };

  const [start, end] = times;
  if (start === undefined) return { intent: 'need_time', categoryId: category?.id ?? null };

  const days = daysInText(t, ctx.now);
  return {
    intent: 'plan',
    days: days.length ? days : [isoWeekday(ctx.now)],
    startMin: start,
    endMin: (end ?? start + 60) % MINUTES_PER_DAY,
    categoryId: category?.id ?? null,
    newName: category ? null : (newActivityName(t) ?? null),
  };
}
