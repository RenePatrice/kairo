/** Chaînes du système de design (namespace « ui »). Les traductions EN viennent de docs/design/i18n. */
export const fr = {
  common: {
    undo: 'Annuler',
    close: 'Fermer',
    apply: 'Appliquer',
    dismiss: 'Ignorer',
    done: 'Fait',
    missed: 'Raté',
  },
  nav: {
    main: 'Navigation principale',
    today: 'Aujourd’hui',
    week: 'Semaine',
    stats: 'Stats',
    me: 'Moi',
    assistant: 'Parler à l’assistant',
  },
  command: {
    label: 'Message à l’assistant',
    placeholder: 'Demande-moi quelque chose…',
    send: 'Envoyer',
    listen: 'Dicter',
    stopListening: 'Arrêter l’écoute',
    listening: 'J’écoute…',
    thinking: 'Je réfléchis…',
    suggestions: 'Suggestions',
  },
  block: {
    aria: '{{title}}, de {{start}} à {{end}}, {{day}}',
    current: 'en cours',
    ghost: 'Proposé par l’IA',
    sleep: 'Sommeil',
  },
  now: {
    label: 'Maintenant',
    next: 'À suivre',
    remaining: 'encore {{time}}',
    noNext: 'Aucun créneau à venir',
    empty: 'Rien de prévu aujourd’hui.',
  },
  insight: { badge: '✦ IA' },
  legend: { label: 'Légende' },
  grid: { label: 'Semaine', hours: 'Heures' },
} as const;

type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };
export type UiStrings = Widen<typeof fr>;
