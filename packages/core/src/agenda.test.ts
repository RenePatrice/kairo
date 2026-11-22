import { describe, expect, it } from 'vitest';
import { buildAgenda, freeSuggestion } from './agenda';
import { DEFAULT_RHYTHM } from './rhythm';
import type { Slot } from './schedule';

const MON = new Date(2026, 10, 23);
const at = (h: number, m = 0) => new Date(2026, 10, 23, h, m);
const slots: Slot[] = [
  { id: 'cours', days: [0], startMin: 540, endMin: 720 },
  { id: 'sport', days: [0], startMin: 1080, endMin: 1140 },
  { id: 'nuit', days: [0], startMin: 1410, endMin: 60 },
];
const kinds = (items: ReturnType<typeof buildAgenda>) =>
  items.map((i) => (i.kind === 'block' ? i.occurrence.slot.id : i.kind));

describe('agenda du jour', () => {
  it('est vide sans créneau', () => {
    expect(buildAgenda([], MON, { rhythm: DEFAULT_RHYTHM })).toEqual([]);
  });

  it('intercale les moments libres de 30 min ou plus', () => {
    const items = buildAgenda(slots, MON, { rhythm: DEFAULT_RHYTHM });
    expect(kinds(items)).toEqual(['free', 'cours', 'free', 'sport', 'free', 'nuit']);
    const first = items[0];
    expect(first).toMatchObject({
      kind: 'free',
      from: 420,
      to: 540,
      suggestStart: 420,
      suggestEnd: 540,
    });
    const afterSport = items[4];
    expect(afterSport).toMatchObject({
      from: 1140,
      to: 1410,
      suggestStart: 1140,
      suggestEnd: 1260,
    });
  });

  it('ancre le créneau qui passe minuit en fin de journée', () => {
    const items = buildAgenda(slots, MON, { rhythm: DEFAULT_RHYTHM });
    expect(items.at(-1)).toMatchObject({ kind: 'block', from: 1410, to: 1500 });
  });

  it('place la ligne « Maintenant » dans un moment libre', () => {
    const items = buildAgenda(slots, MON, { rhythm: DEFAULT_RHYTHM, now: at(15) });
    expect(kinds(items)).toEqual(['free', 'cours', 'free', 'now', 'free', 'sport', 'free', 'nuit']);
    expect(items[3]).toEqual({ kind: 'now', minute: 900 });
  });

  it('marque le créneau en cours au lieu d’une ligne', () => {
    const items = buildAgenda(slots, MON, { rhythm: DEFAULT_RHYTHM, now: at(10) });
    expect(items.some((i) => i.kind === 'now')).toBe(false);
    expect(items[1]).toMatchObject({ kind: 'block', current: true });
  });

  it('n’affiche pas « Maintenant » un autre jour ni avant le début', () => {
    const tue = new Date(2026, 10, 24, 15);
    expect(
      buildAgenda(slots, MON, { rhythm: DEFAULT_RHYTHM, now: tue }).some((i) => i.kind === 'now'),
    ).toBe(false);
    expect(
      buildAgenda(slots, MON, { rhythm: DEFAULT_RHYTHM, now: at(6) }).some((i) => i.kind === 'now'),
    ).toBe(false);
  });

  it('propose au plus 2 h dans un moment libre, au quart d’heure', () => {
    expect(freeSuggestion(1142, 1500)).toEqual({ suggestStart: 1155, suggestEnd: 1275 });
    expect(freeSuggestion(1400, 1500)).toEqual({ suggestStart: 1410, suggestEnd: 60 });
  });
});
