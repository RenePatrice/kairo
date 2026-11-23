import { describe, expect, it } from 'vitest';
import { makeContext } from './__fixtures__/context';
import { buildSystemPrompt, retryPrompt } from './prompt';
import { llmReplyJsonSchema } from './schema';
import { daysInText, newActivityName } from './rules';

describe('buildSystemPrompt', () => {
  it('donne le contexte du jour, le rythme, les activités et les références', () => {
    const p = buildSystemPrompt(makeContext());
    expect(p).toContain('Tu proposes, tu n’appliques jamais.');
    expect(p).toContain('en français');
    expect(p).toContain('2026-11-23 (mon), il est 10:30.');
    expect(p).toContain('réveil 07:00, coucher 23:30');
    expect(p).toContain('- Révisions · 10 h/sem');
    expect(p).toContain('- b1 · Révisions · mon tue wed thu fri · 09:00–12:00');
    expect(p).toContain('- b3 · Salle · tue thu · 18:00–19:00');
  });

  it('existe en anglais, avec les créneaux ponctuels et les stats', () => {
    const ctx = makeContext({
      locale: 'en',
      categories: [],
      blocks: [
        { id: 'x', categoryId: 'gone', days: [], once: '2026-11-28', startMin: 600, endMin: 660 },
      ],
    });
    const p = buildSystemPrompt(ctx, { stats: '82 % consistency' });
    expect(p).toContain('You suggest; you never apply anything.');
    expect(p).toContain('in English');
    expect(p).toContain('Activities :\n- none');
    expect(p).toContain('- b1 · ? · on 2026-11-28 · 10:00–11:00');
    expect(p).toContain('Stats :\n82 % consistency');
  });

  it('n’envoie jamais les notes ni les étapes', () => {
    const secret = { note: 'rendez-vous médical', steps: ['code 1234'] };
    const ctx = makeContext();
    const blocks = ctx.blocks.map((b) => ({ ...b, ...secret }));
    const p = buildSystemPrompt({ ...ctx, blocks });
    expect(p).not.toContain('médical');
    expect(p).not.toContain('1234');
  });

  it('écrit le message de nouvelle tentative dans la bonne langue', () => {
    expect(retryPrompt(makeContext(), ['a', 'b'])).toContain('invalide : a ; b');
    expect(retryPrompt(makeContext({ locale: 'en' }), ['a'])).toContain('invalid: a');
  });
});

describe('schéma JSON imposé au modèle', () => {
  it('décrit intent, message et operations', () => {
    expect(llmReplyJsonSchema).toMatchObject({
      type: 'object',
      required: expect.arrayContaining(['intent', 'message', 'operations']),
    });
  });
});

describe('aides du moteur de règles', () => {
  it('lit les jours, sans doublon et triés', () => {
    const now = new Date('2026-11-29T10:00:00+01:00'); // dimanche
    expect(daysInText('jeudi et lundi et jeudi', now)).toEqual([0, 3]);
    expect(daysInText('Salle demain', now)).toEqual([0]);
    expect(daysInText('vendredi et le week-end', now)).toEqual([4, 5, 6]);
    expect(daysInText('rien', now)).toEqual([]);
  });

  it('refuse un nom d’activité trop court', () => {
    expect(newActivityName('à 18h')).toBeNull();
  });
});
