/**
 * Jeu de demandes types de l'assistant (cahier des charges : « 50 demandes types »).
 * - `RULE_CASES` : ce que le moteur de règles doit comprendre seul, hors ligne ;
 * - `MODEL_CASES` : ce qui part vers Llama ; la réponse du modèle est simulée (CI sans IA),
 *   y compris des réponses fausses que le code doit refuser.
 * Le même jeu sert au banc d'essai des modèles (tâche 10), avec une vraie réponse de Llama.
 */
import type { RuleIntent } from '../rules';
import type { AiSuggestion } from '../schema';
import type { ResolveError } from '../suggest';

const ALL = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [0, 1, 2, 3, 4];

export interface RuleCase {
  text: string;
  expect: RuleIntent;
}

export const RULE_CASES: RuleCase[] = [
  // Planifier une activité existante
  {
    text: 'Salle mardi et jeudi 18h-19h',
    expect: {
      intent: 'plan',
      days: [1, 3],
      startMin: 1080,
      endMin: 1140,
      categoryId: 'c-salle',
      newName: null,
    },
  },
  {
    text: 'Lecture tous les jours 22h-22h30',
    expect: {
      intent: 'plan',
      days: ALL,
      startMin: 1320,
      endMin: 1350,
      categoryId: 'c-lec',
      newName: null,
    },
  },
  {
    text: 'Révisions le week-end 10h-12h',
    expect: {
      intent: 'plan',
      days: [5, 6],
      startMin: 600,
      endMin: 720,
      categoryId: 'c-rev',
      newName: null,
    },
  },
  {
    text: 'Salle en semaine 18h-19h',
    expect: {
      intent: 'plan',
      days: WEEKDAYS,
      startMin: 1080,
      endMin: 1140,
      categoryId: 'c-salle',
      newName: null,
    },
  },
  {
    text: 'Salle demain 18h-19h',
    expect: {
      intent: 'plan',
      days: [1],
      startMin: 1080,
      endMin: 1140,
      categoryId: 'c-salle',
      newName: null,
    },
  },
  {
    text: 'Salle 18h',
    expect: {
      intent: 'plan',
      days: [0],
      startMin: 1080,
      endMin: 1140,
      categoryId: 'c-salle',
      newName: null,
    },
  },
  {
    text: 'Programme salle mardi 18h',
    expect: {
      intent: 'plan',
      days: [1],
      startMin: 1080,
      endMin: 1140,
      categoryId: 'c-salle',
      newName: null,
    },
  },
  {
    text: 'Révisions samedi 9h30 à 11h',
    expect: {
      intent: 'plan',
      days: [5],
      startMin: 570,
      endMin: 660,
      categoryId: 'c-rev',
      newName: null,
    },
  },
  // Nouvelle activité repérée dans la phrase
  {
    text: 'Gardes lundi et mardi 7h-19h',
    expect: {
      intent: 'plan',
      days: [0, 1],
      startMin: 420,
      endMin: 1140,
      categoryId: null,
      newName: 'Gardes',
    },
  },
  {
    text: 'Piano mercredi 17h30',
    expect: {
      intent: 'plan',
      days: [2],
      startMin: 1050,
      endMin: 1110,
      categoryId: null,
      newName: 'Piano',
    },
  },
  {
    text: 'Ajoute du yoga samedi 9h-10h',
    expect: {
      intent: 'plan',
      days: [5],
      startMin: 540,
      endMin: 600,
      categoryId: null,
      newName: 'Yoga',
    },
  },
  {
    text: 'Football saturday 3pm-5pm',
    expect: {
      intent: 'plan',
      days: [5],
      startMin: 900,
      endMin: 1020,
      categoryId: null,
      newName: 'Football',
    },
  },
  {
    text: 'Gym every day 6am to 7am',
    expect: {
      intent: 'plan',
      days: ALL,
      startMin: 360,
      endMin: 420,
      categoryId: null,
      newName: 'Gym',
    },
  },
  {
    text: 'Course du lundi au vendredi 6h-6h45',
    expect: {
      intent: 'plan',
      days: WEEKDAYS,
      startMin: 360,
      endMin: 405,
      categoryId: null,
      newName: 'Course',
    },
  },
  {
    text: 'Méditation chaque jour 23h30-0h15',
    expect: {
      intent: 'plan',
      days: ALL,
      startMin: 1410,
      endMin: 15,
      categoryId: null,
      newName: 'Méditation',
    },
  },
  {
    text: 'Book swimming on sunday 8am-9am',
    expect: {
      intent: 'plan',
      days: [6],
      startMin: 480,
      endMin: 540,
      categoryId: null,
      newName: 'Swimming',
    },
  },
  {
    text: 'Mets anglais le mardi 20h-21h',
    expect: {
      intent: 'plan',
      days: [1],
      startMin: 1200,
      endMin: 1260,
      categoryId: null,
      newName: 'Anglais',
    },
  },
  // Moments libres
  {
    text: 'Créneaux libres aujourd’hui',
    expect: { intent: 'free_time', categoryId: null, length: 45 },
  },
  { text: 'Mes moments libres', expect: { intent: 'free_time', categoryId: null, length: 45 } },
  {
    text: 'Créneau libre pour Salle',
    expect: { intent: 'free_time', categoryId: 'c-salle', length: 60 },
  },
  {
    text: 'Quand suis-je dispo pour Révisions ?',
    expect: { intent: 'free_time', categoryId: 'c-rev', length: 120 },
  },
  {
    text: 'Find me free time for Lecture',
    expect: { intent: 'free_time', categoryId: 'c-lec', length: 30 },
  },
  {
    text: 'Am I available this afternoon?',
    expect: { intent: 'free_time', categoryId: null, length: 45 },
  },
  // Analyse, bilan, stats
  { text: 'Analyse ma semaine', expect: { intent: 'analysis' } },
  { text: 'Quelle est ma tendance ?', expect: { intent: 'analysis' } },
  { text: 'Analyze my week', expect: { intent: 'analysis' } },
  { text: 'Fais le bilan de ma journée', expect: { intent: 'day_review' } },
  { text: 'Review my day', expect: { intent: 'day_review' } },
  { text: 'Combien d’heures cette semaine ?', expect: { intent: 'stats' } },
  { text: 'Show my stats', expect: { intent: 'stats' } },
  { text: 'How many hours of Salle?', expect: { intent: 'stats' } },
  // L'heure manque
  { text: 'Planifie Salle', expect: { intent: 'need_time', categoryId: 'c-salle' } },
  { text: 'Je veux faire du piano', expect: { intent: 'need_time', categoryId: null } },
  { text: 'Lecture le soir', expect: { intent: 'need_time', categoryId: 'c-lec' } },
  // Trop riche pour les règles : part vers Llama
  {
    text: 'Construis-moi une semaine d’étudiant avec du foot le samedi',
    expect: { intent: 'needs_model' },
  },
  { text: 'Déplace mon sport à 18h', expect: { intent: 'needs_model' } },
  { text: 'Supprime la lecture de dimanche', expect: { intent: 'needs_model' } },
  { text: 'Move Salle to Friday 7pm', expect: { intent: 'needs_model' } },
  {
    text: 'Révisions lundi 8h-10h, Salle mardi 18h-19h, Lecture 22h-23h',
    expect: { intent: 'needs_model' },
  },
];

export interface ModelCase {
  text: string;
  /** Réponse simulée du modèle (objet décodé ou texte brut). */
  llm: unknown;
  expect: {
    kind: AiSuggestion['kind'] | null;
    /** Nombre d'opérations par type dans la proposition. */
    ops?: Partial<Record<AiSuggestion['operations'][number]['op'], number>>;
    errors?: ResolveError['code'][];
    warnings?: AiSuggestion['warnings'][number]['code'][];
  };
}

export const MODEL_CASES: ModelCase[] = [
  {
    text: 'Construis-moi une semaine d’étudiant avec du foot le samedi',
    llm: {
      intent: 'plan',
      message: 'Je te propose des cours le matin, des révisions l’après-midi et du foot le samedi.',
      operations: [
        { op: 'add_activity', name: 'Foot', weeklyGoalH: 2 },
        {
          op: 'add_block',
          activity: 'Foot',
          days: ['sat'],
          date: null,
          start: '14:00',
          end: '16:00',
        },
        {
          op: 'add_block',
          activity: 'Cours',
          days: ['mon', 'tue', 'wed', 'thu', 'fri'],
          date: null,
          start: '13:00',
          end: '16:00',
        },
        {
          op: 'add_block',
          activity: 'Révisions',
          days: ['mon', 'tue', 'wed', 'thu'],
          date: null,
          start: '16:30',
          end: '17:30',
        },
      ],
    },
    expect: { kind: 'create_week', ops: { add_category: 2, add: 3 }, errors: [] },
  },
  {
    text: 'Déplace la salle à vendredi 19h',
    llm: {
      intent: 'plan',
      message: 'Je déplace ta séance de salle au vendredi à 19 h.',
      operations: [{ op: 'move_block', ref: 'b3', days: ['fri'], start: '19:00', end: '20:00' }],
    },
    expect: { kind: 'move_block', ops: { update: 1 }, errors: [] },
  },
  {
    text: 'Supprime la lecture',
    llm: {
      intent: 'plan',
      message: 'Je retire ta lecture du soir.',
      operations: [{ op: 'delete_block', ref: 'b2' }],
    },
    expect: { kind: 'delete_block', ops: { delete: 1 }, errors: [] },
  },
  {
    text: 'Annule mon cours de danse',
    llm: {
      intent: 'plan',
      message: 'Je supprime la danse.',
      operations: [{ op: 'delete_block', ref: 'b9' }],
    },
    expect: { kind: null, errors: ['unknown_ref'] },
  },
  {
    text: 'Révisions tard le soir',
    llm: {
      intent: 'plan',
      message: 'Révisions à 25 h.',
      operations: [
        {
          op: 'add_block',
          activity: 'Révisions',
          days: ['mon'],
          date: null,
          start: '25:00',
          end: '26:00',
        },
      ],
    },
    expect: { kind: null, errors: ['schema'] },
  },
  {
    text: 'Organise ma semaine',
    llm: 'Voici ta semaine : {"intent": "plan"',
    expect: { kind: null, errors: ['invalid_json'] },
  },
  {
    text: 'Organise mon mardi',
    llm: { intent: 'need_info', message: 'À quelle heure commences-tu le mardi ?', operations: [] },
    expect: { kind: null, errors: [] },
  },
  {
    text: 'Ajoute du piano',
    llm: {
      intent: 'plan',
      message: 'Piano ajouté.',
      operations: [
        { op: 'add_block', activity: 'Piano', days: [], date: null, start: '17:00', end: '18:00' },
      ],
    },
    expect: { kind: null, ops: { add_category: 0 }, errors: ['invalid_slot'] },
  },
  {
    text: 'Piano mardi après la salle',
    llm: {
      intent: 'plan',
      message: 'Piano le mardi à 18 h 30.',
      operations: [
        {
          op: 'add_block',
          activity: 'Piano',
          days: ['tue'],
          date: null,
          start: '18:30',
          end: '19:30',
        },
      ],
    },
    expect: {
      kind: 'add_block',
      ops: { add_category: 1, add: 1 },
      errors: [],
      warnings: ['overlap'],
    },
  },
  {
    text: 'Lecture à 1 h du matin',
    llm: {
      intent: 'plan',
      message: 'Lecture de 1 h à 1 h 30.',
      operations: [
        {
          op: 'add_block',
          activity: 'Lecture',
          days: ['sat'],
          date: null,
          start: '01:00',
          end: '01:30',
        },
      ],
    },
    expect: { kind: 'add_block', ops: { add: 1 }, errors: [], warnings: ['in_sleep'] },
  },
  {
    text: 'Soirée samedi de 22h à 2h',
    llm: {
      intent: 'plan',
      message: 'Soirée samedi, de 22 h à 2 h.',
      operations: [
        {
          op: 'add_block',
          activity: 'Soirée',
          days: [],
          date: '2026-11-28',
          start: '22:00',
          end: '02:00',
        },
      ],
    },
    expect: { kind: 'add_block', ops: { add_category: 1, add: 1 }, errors: [] },
  },
  {
    text: 'Passe mes révisions l’après-midi',
    llm: {
      intent: 'plan',
      message: 'Je passe tes révisions de 14 h à 17 h.',
      operations: [
        { op: 'delete_block', ref: 'b1' },
        {
          op: 'add_block',
          activity: 'Révisions',
          days: ['mon', 'tue', 'wed', 'thu', 'fri'],
          date: null,
          start: '14:00',
          end: '17:00',
        },
      ],
    },
    expect: { kind: 'reschedule', ops: { delete: 1, add: 1 }, errors: [], warnings: [] },
  },
  {
    text: 'Build me a gym routine',
    llm: {
      intent: 'plan',
      message: 'Gym on Monday, Wednesday and Friday mornings.',
      operations: [
        { op: 'add_activity', name: 'Gym', weeklyGoalH: 3 },
        {
          op: 'add_block',
          activity: 'gym',
          days: ['mon', 'wed', 'fri'],
          date: null,
          start: '07:00',
          end: '08:00',
        },
      ],
    },
    expect: { kind: 'add_block', ops: { add_category: 1, add: 1 }, errors: [] },
  },
  {
    text: 'Pause de 2 minutes',
    llm: {
      intent: 'plan',
      message: 'Pause ajoutée.',
      operations: [
        {
          op: 'add_block',
          activity: 'Pause',
          days: ['mon'],
          date: null,
          start: '10:00',
          end: '10:02',
        },
      ],
    },
    expect: { kind: null, errors: ['invalid_slot'] },
  },
  {
    text: 'Comment se passe ma semaine ?',
    llm: {
      intent: 'analysis',
      message: 'Tu tiens 82 % de ton programme cette semaine.',
      operations: [],
    },
    expect: { kind: null, errors: [] },
  },
  {
    text: 'Ajoute un événement',
    llm: { intent: 'plan', message: 'OK', operations: [{ op: 'add_event', title: 'Dîner' }] },
    expect: { kind: null, errors: ['schema'] },
  },
];
