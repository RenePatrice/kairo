/**
 * Prompt système de l'assistant (Llama). Il fixe le rôle, le format JSON et le contexte du
 * planning. Les notes privées et les étapes ne sont jamais incluses.
 */
import { formatClock, isoWeekday, dateKey } from '@kairo/core';
import { refBlocks, type AssistantContext } from './context';
import { DAY_CODES } from './schema';

const RULES = {
  fr: (lang: string) =>
    [
      'Tu es l’assistant de Kairo, un planificateur de semaine. Tu proposes, tu n’appliques jamais.',
      'Réponds UNIQUEMENT avec un objet JSON conforme au schéma fourni, sans texte autour.',
      `- "message" : une ou deux phrases simples, chaleureuses, sans jargon, en ${lang}. Explique ce que tu proposes avant toute action.`,
      '- Jours : mon tue wed thu fri sat sun. Heures : "HH:MM" sur 24 h. Un créneau peut finir après minuit ("23:00" → "01:00") ; il appartient au jour où il commence.',
      '- Réutilise le nom exact d’une activité existante quand c’est la même ; sinon ajoute d’abord "add_activity".',
      '- Pour modifier ou supprimer, désigne le créneau par sa référence (b1, b2…). N’invente jamais de référence.',
      '- Respecte le rythme : ne place rien pendant le sommeil sauf demande explicite.',
      '- S’il manque une information indispensable (l’heure, par exemple) : intent "need_info", aucune opération, et pose une seule question courte.',
      '- Questions sur les stats ou les bilans : intent "answer" ou "analysis", aucune opération ; appuie-toi uniquement sur les chiffres fournis.',
    ].join('\n'),
  en: (lang: string) =>
    [
      'You are the Kairo assistant, a weekly planner. You suggest; you never apply anything.',
      'Reply ONLY with a JSON object matching the provided schema, with no text around it.',
      `- "message": one or two simple, warm sentences, no jargon, in ${lang}. Explain what you suggest before any action.`,
      '- Days: mon tue wed thu fri sat sun. Times: "HH:MM", 24-hour. A slot may end after midnight ("23:00" → "01:00"); it belongs to the day it starts.',
      '- Reuse the exact name of an existing activity when it is the same one; otherwise add "add_activity" first.',
      '- To change or delete a slot, refer to it by its reference (b1, b2…). Never invent a reference.',
      '- Respect the rhythm: never place anything during sleep unless explicitly asked.',
      '- If essential information is missing (the time, for example): intent "need_info", no operations, and ask one short question.',
      '- Questions about stats or reviews: intent "answer" or "analysis", no operations; rely only on the figures provided.',
    ].join('\n'),
};

const LABELS = {
  fr: {
    lang: 'français',
    today: 'Aujourd’hui',
    time: 'il est',
    rhythm: 'Rythme : réveil',
    sleep: 'coucher',
    acts: 'Activités',
    blocks: 'Créneaux',
    goal: 'h/sem',
    once: 'le',
    none: 'aucun',
    stats: 'Statistiques',
  },
  en: {
    lang: 'English',
    today: 'Today',
    time: 'it is',
    rhythm: 'Rhythm: wake',
    sleep: 'sleep',
    acts: 'Activities',
    blocks: 'Slots',
    goal: 'h/wk',
    once: 'on',
    none: 'none',
    stats: 'Stats',
  },
} as const;

export interface PromptOptions {
  /** Chiffres utiles à la demande (régularité, heures par activité…), déjà calculés par `core`. */
  stats?: string;
}

export function buildSystemPrompt(ctx: AssistantContext, options: PromptOptions = {}): string {
  const l = LABELS[ctx.locale];
  const nowMin = ctx.now.getHours() * 60 + ctx.now.getMinutes();
  const weekday = DAY_CODES[isoWeekday(ctx.now)];
  const acts = ctx.categories.length
    ? ctx.categories.map((c) => `- ${c.name} · ${c.weeklyGoalH} ${l.goal}`).join('\n')
    : `- ${l.none}`;
  const refs = refBlocks(ctx);
  const blocks = refs.length
    ? refs
        .map(({ ref, block, category }) => {
          const when = block.once
            ? `${l.once} ${block.once}`
            : block.days.map((d) => DAY_CODES[d]).join(' ');
          return `- ${ref} · ${category?.name ?? '?'} · ${when} · ${formatClock(block.startMin)}–${formatClock(block.endMin)}`;
        })
        .join('\n')
    : `- ${l.none}`;
  return [
    RULES[ctx.locale](l.lang),
    '',
    `${l.today} : ${dateKey(ctx.now)} (${weekday}), ${l.time} ${formatClock(nowMin)}.`,
    `${l.rhythm} ${formatClock(ctx.rhythm.wakeMin)}, ${l.sleep} ${formatClock(ctx.rhythm.sleepMin)}.`,
    `${l.acts} :`,
    acts,
    `${l.blocks} :`,
    blocks,
    ...(options.stats ? [`${l.stats} :`, options.stats] : []),
  ].join('\n');
}

/** Message de correction pour l'unique nouvelle tentative après une réponse invalide. */
export function retryPrompt(ctx: AssistantContext, problems: readonly string[]): string {
  return ctx.locale === 'fr'
    ? `Ta réponse est invalide : ${problems.join(' ; ')}. Renvoie uniquement un JSON conforme au schéma.`
    : `Your reply is invalid: ${problems.join('; ')}. Send back only JSON matching the schema.`;
}
