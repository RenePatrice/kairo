import { describe, expect, it } from 'vitest';
import { makeContext } from './__fixtures__/context';
import { MODEL_CASES, RULE_CASES } from './__fixtures__/requests';
import { parseRequest } from './rules';
import { AiSuggestion } from './schema';
import { resolveLlmReply } from './suggest';

describe('jeu de demandes types', () => {
  it('compte au moins 50 demandes', () => {
    expect(RULE_CASES.length + MODEL_CASES.length).toBeGreaterThanOrEqual(50);
  });

  describe('moteur de règles (hors ligne)', () => {
    it.each(RULE_CASES)('« $text »', ({ text, expect: expected }) => {
      expect(parseRequest(text, makeContext())).toEqual(expected);
    });
  });

  describe('réponses simulées de Llama', () => {
    it.each(MODEL_CASES)('« $text »', ({ llm, expect: expected }) => {
      const ctx = makeContext();
      const before = structuredClone(ctx.blocks);
      const { suggestion, errors } = resolveLlmReply(llm, ctx, 'server');

      expect(errors.map((e) => e.code)).toEqual(expected.errors ?? []);
      expect(suggestion?.kind ?? null).toBe(expected.kind);
      // Jamais appliqué sans validation : rien ne change dans le planning, tout reste « pending ».
      expect(ctx.blocks).toEqual(before);
      if (!suggestion) return;
      expect(suggestion.status).toBe('pending');
      expect(AiSuggestion.safeParse(suggestion).success).toBe(true);
      for (const [op, count] of Object.entries(expected.ops ?? {})) {
        expect(suggestion.operations.filter((o) => o.op === op)).toHaveLength(count);
      }
      if (expected.warnings) {
        expect(suggestion.warnings.map((w) => w.code)).toEqual(expected.warnings);
      }
    });
  });
});
