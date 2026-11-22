import { describe, expect, it } from 'vitest';
import { ambientColors } from './ambient';

describe('ambientColors', () => {
  it('suit le moment de la journée', () => {
    expect(ambientColors(120)).toEqual(['#3B3A8F', '#24205C']);
    expect(ambientColors(420)).toEqual(['#E8A06A', '#C86B9A']);
    expect(ambientColors(720)).toEqual(['#5B8DEF', '#4FB8C4']);
    expect(ambientColors(1439)).toEqual(['#5048B8', '#7A5CD6']);
  });
  it('prend la couleur du bloc en cours', () => {
    expect(ambientColors(720, '#FF7A85')).toEqual(['#FF7A85', '#4FB8C4']);
  });
});
