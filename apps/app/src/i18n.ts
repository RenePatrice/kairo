/** Chaînes de l'app (namespace « app »). Les chaînes du système de design sont dans @kairo/ui. */
const fr = {
  preview: {
    eyebrow: '// Kairo · Phase 0',
    titleA: 'Le langage',
    titleB: 'visuel.',
    intro:
      'Chaque composant en verre liquide, dans les trois ambiances, avec et sans transparence. Données de démonstration.',
    controls: 'Réglages d’affichage',
    theme: 'Ambiance',
    accent: 'Accent',
    transparency: 'Transparence',
    motion: 'Animations',
    language: 'Langue',
    auto: 'Auto',
    reduced: 'Réduite',
    reducedMotion: 'Réduites',
    glassNow: 'Verre actuel : {{quality}}',
    sections: {
      now: 'Maintenant',
      week: 'Semaine',
      blocks: 'Blocs',
      ai: 'Assistant',
      glass: 'Verre et repli',
      controls: 'Boutons et puces',
    },
    variants: { default: 'Normal', current: 'En cours', ghost: 'Fantôme IA', sleep: 'Sommeil' },
    glassLabel: 'Verre',
    solidLabel: 'Repli plein',
    stats: { done: 'Réalisé', streak: 'Série', rate: 'Régularité', vsPlan: '+2 h vs prévu' },
    topic: { eyebrow: 'Thème du jour', title: 'Sécurité web' },
    streak: '7 J DE SÉRIE',
    rest: 'Journée off',
    ai: {
      suggestions: ['Analyse ma semaine', 'Ajoute du foot samedi', 'Combien d’heures de labo ?'],
      proposal: 'Je propose {{title}} {{day}} {{time}}. Vérifie avant que je l’ajoute.',
      proposalTitle: 'Nouveau créneau',
      added: 'Ajouté · {{title}}',
      removed: 'Créneau retiré',
      ghostHint:
        'Le bloc irisé sur la grille est l’aperçu : rien n’est appliqué sans ta validation.',
      review:
        'Tu as fait 11 h de labo cette semaine, 2 h de plus que prévu. Le mercredi est ton jour le plus chargé : allège-le ?',
      reviewTitle: 'Bilan de la semaine',
      demoNote: 'Démo : l’IA Llama arrive en Phase 2. Ici, la réponse est simulée.',
    },
    sheet: { note: 'Note', repeat: 'Répétition', delete: 'Supprimer', save: 'Enregistrer' },
    football: 'Foot',
    sampleNote: 'Chapitre 4',
    compact: 'Compact',
    showToast: 'Afficher un toast',
    activities: {
      cours: 'Cours',
      labo: 'Labo',
      udemy: 'Udemy',
      sport: 'Sport',
      diner: 'Dîner',
      revisions: 'Révisions',
      sommeil: 'Sommeil',
      focus: 'Session focus',
    },
  },
};

type Widen<T> = {
  [K in keyof T]: T[K] extends string
    ? string
    : T[K] extends readonly string[]
      ? string[]
      : Widen<T[K]>;
};

const en: Widen<typeof fr> = {
  preview: {
    eyebrow: '// Kairo · Phase 0',
    titleA: 'The visual',
    titleB: 'language.',
    intro:
      'Every liquid-glass component, in all three themes, with and without transparency. Demo data.',
    controls: 'Display settings',
    theme: 'Theme',
    accent: 'Accent',
    transparency: 'Transparency',
    motion: 'Animations',
    language: 'Language',
    auto: 'Auto',
    reduced: 'Reduced',
    reducedMotion: 'Reduced',
    glassNow: 'Current glass: {{quality}}',
    sections: {
      now: 'Now',
      week: 'Week',
      blocks: 'Blocks',
      ai: 'Assistant',
      glass: 'Glass and fallback',
      controls: 'Buttons and chips',
    },
    variants: { default: 'Default', current: 'In progress', ghost: 'AI ghost', sleep: 'Sleep' },
    glassLabel: 'Glass',
    solidLabel: 'Solid fallback',
    stats: { done: 'Done', streak: 'Streak', rate: 'Consistency', vsPlan: '+2 h vs plan' },
    topic: { eyebrow: 'Theme of the day', title: 'Web security' },
    streak: '7-DAY STREAK',
    rest: 'Day off',
    ai: {
      suggestions: ['Analyze my week', 'Add football on Saturday', 'How many lab hours?'],
      proposal: 'I suggest {{title}} {{day}} {{time}}. Check it before I add it.',
      proposalTitle: 'New slot',
      added: 'Added · {{title}}',
      removed: 'Slot removed',
      ghostHint:
        'The iridescent block on the grid is the preview: nothing is applied without your OK.',
      review:
        'You did 11 h of lab this week, 2 h more than planned. Wednesday is your busiest day: lighten it?',
      reviewTitle: 'Weekly review',
      demoNote: 'Demo: the Llama AI arrives in Phase 2. The answer here is simulated.',
    },
    sheet: { note: 'Note', repeat: 'Repeat', delete: 'Delete', save: 'Save' },
    football: 'Football',
    sampleNote: 'Chapter 4',
    compact: 'Compact',
    showToast: 'Show a toast',
    activities: {
      cours: 'Classes',
      labo: 'Lab',
      udemy: 'Udemy',
      sport: 'Sport',
      diner: 'Dinner',
      revisions: 'Revision',
      sommeil: 'Sleep',
      focus: 'Focus session',
    },
  },
};

export const appResources = { fr: { app: fr }, en: { app: en } };
