import { describe, expect, it } from 'vitest';
import { makeContext, PALETTE } from './__fixtures__/context';
import { parseRequest } from './rules';
import { ASSISTANT_REMINDER_MIN, planSuggestion, resolveLlmReply } from './suggest';

const plan = (text: string, ctx = makeContext()) => {
  const intent = parseRequest(text, ctx);
  if (intent.intent !== 'plan') throw new Error(`intention inattendue : ${intent.intent}`);
  return planSuggestion(intent, ctx, 'Nouvelle activité');
};

describe('planSuggestion (carte de la maquette)', () => {
  it('cale un créneau dans une activité existante, rappel 10 min avant', () => {
    const s = plan('Salle vendredi 7h-8h');
    expect(s).toMatchObject({
      kind: 'add_block',
      source: 'rules',
      status: 'pending',
      warnings: [],
    });
    expect(s.operations).toEqual([
      {
        op: 'add',
        block: {
          id: expect.any(String),
          categoryId: 'c-salle',
          days: [4],
          once: null,
          startMin: 420,
          endMin: 480,
          reminderMin: ASSISTANT_REMINDER_MIN,
          steps: [],
          note: '',
        },
      },
    ]);
  });

  it('crée la nouvelle activité avec la couleur suivante et un objectif tiré du créneau', () => {
    const s = plan('Gardes lundi et mardi 7h-19h');
    const [cat, add] = s.operations;
    expect(cat).toEqual({
      op: 'add_category',
      category: { id: expect.any(String), name: 'Gardes', color: PALETTE[3], weeklyGoalH: 24 },
    });
    expect(add?.op === 'add' && cat?.op === 'add_category' && add.block.categoryId).toBe(
      cat?.op === 'add_category' && cat.category.id,
    );
  });

  it('prend le nom de secours quand la phrase ne donne pas de nom', () => {
    const s = planSuggestion(
      { intent: 'plan', days: [0], startMin: 600, endMin: 660, categoryId: null, newName: null },
      makeContext(),
      'Nouvelle activité',
    );
    expect(s.operations[0]).toMatchObject({ category: { name: 'Nouvelle activité' } });
  });

  it('avertit d’un chevauchement et d’un créneau pendant le sommeil', () => {
    expect(plan('Piano mardi 18h30-19h30').warnings).toEqual([
      { code: 'overlap', op: 1, names: ['Salle'] },
    ]);
    expect(plan('Lecture samedi 2h-3h').warnings).toEqual([{ code: 'in_sleep', op: 0, names: [] }]);
  });

  it('recycle la palette quand il y a plus d’activités que de couleurs', () => {
    const ctx = makeContext({ palette: ['#111111', '#222222'] });
    const s = plan('Piano lundi 17h', ctx);
    expect(s.operations[0]).toMatchObject({ category: { color: '#222222' } });
  });
});

describe('resolveLlmReply', () => {
  it('traduit un déplacement sans changer les jours si le modèle ne les donne pas', () => {
    const { suggestion } = resolveLlmReply(
      {
        intent: 'plan',
        message: 'Salle une heure plus tard.',
        operations: [{ op: 'move_block', ref: 'b3', start: '19:00', end: '20:00' }],
      },
      makeContext(),
      'local',
    );
    expect(suggestion?.operations).toEqual([
      { op: 'update', blockId: 'bl-salle', patch: { startMin: 1140, endMin: 1200 } },
    ]);
    expect(suggestion).toMatchObject({ source: 'local', summary: 'Salle une heure plus tard.' });
  });

  it('refuse un déplacement vers une référence inconnue ou un créneau trop court', () => {
    const ctx = makeContext();
    const { errors } = resolveLlmReply(
      {
        intent: 'plan',
        message: 'x',
        operations: [
          { op: 'move_block', ref: 'b7', start: '10:00', end: '11:00' },
          { op: 'move_block', ref: 'b1', start: '10:00', end: '10:01' },
        ],
      },
      ctx,
      'server',
    );
    expect(errors).toEqual([
      { code: 'unknown_ref', op: 0, ref: 'b7' },
      { code: 'invalid_slot', op: 1, errors: ['too_short'] },
    ]);
  });

  it('garde les opérations valides et signale les autres', () => {
    const { suggestion, errors } = resolveLlmReply(
      {
        intent: 'plan',
        message: 'x',
        operations: [
          { op: 'delete_block', ref: 'b2' },
          { op: 'delete_block', ref: 'b42' },
        ],
      },
      makeContext(),
      'server',
    );
    expect(suggestion?.operations).toEqual([{ op: 'delete', blockId: 'bl-lec' }]);
    expect(errors).toEqual([{ code: 'unknown_ref', op: 1, ref: 'b42' }]);
  });

  it('accepte une proposition qui ne fait que créer une activité', () => {
    const { suggestion } = resolveLlmReply(
      {
        intent: 'plan',
        message: 'Je crée Piano.',
        operations: [{ op: 'add_activity', name: 'Piano', weeklyGoalH: 2 }],
      },
      makeContext(),
      'server',
    );
    expect(suggestion?.kind).toBe('add_activity');
  });

  it('réutilise une activité existante citée par add_activity', () => {
    const { suggestion } = resolveLlmReply(
      {
        intent: 'plan',
        message: 'x',
        operations: [
          { op: 'add_activity', name: 'salle', weeklyGoalH: 4 },
          {
            op: 'add_block',
            activity: 'Salle',
            days: ['sun'],
            date: null,
            start: '10:00',
            end: '11:00',
          },
        ],
      },
      makeContext(),
      'server',
    );
    expect(suggestion?.operations).toHaveLength(1);
    expect(suggestion?.operations[0]).toMatchObject({
      block: { categoryId: 'c-salle', days: [6] },
    });
  });

  it('détaille les erreurs de schéma pour la nouvelle tentative', () => {
    const { errors } = resolveLlmReply({ intent: 'plan', operations: [] }, makeContext(), 'server');
    expect(errors[0]).toMatchObject({
      code: 'schema',
      issues: [expect.stringContaining('message')],
    });
  });

  it('lit une réponse JSON en texte', () => {
    const { reply } = resolveLlmReply(
      JSON.stringify({ intent: 'answer', message: 'Oui.', operations: [] }),
      makeContext(),
      'server',
    );
    expect(reply?.intent).toBe('answer');
  });

  it('avertit d’un chevauchement entre deux créneaux d’une même proposition', () => {
    const { suggestion } = resolveLlmReply(
      {
        intent: 'plan',
        message: 'x',
        operations: [
          {
            op: 'add_block',
            activity: 'Piano',
            days: ['sat'],
            date: null,
            start: '10:00',
            end: '11:00',
          },
          {
            op: 'add_block',
            activity: 'Chant',
            days: ['sat'],
            date: null,
            start: '10:30',
            end: '11:30',
          },
        ],
      },
      makeContext(),
      'server',
    );
    expect(suggestion?.warnings).toEqual([{ code: 'overlap', op: 3, names: ['Piano'] }]);
  });

  it('vérifie le déplacement contre les autres créneaux', () => {
    const { suggestion } = resolveLlmReply(
      {
        intent: 'plan',
        message: 'x',
        operations: [{ op: 'move_block', ref: 'b3', days: ['mon'], start: '10:00', end: '11:00' }],
      },
      makeContext(),
      'server',
    );
    expect(suggestion?.warnings).toEqual([{ code: 'overlap', op: 0, names: ['Révisions'] }]);
  });
});
