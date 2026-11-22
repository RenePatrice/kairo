import { describe, expect, it } from 'vitest';
import { contrastRatio, hexToRgb, inkFor, relativeLuminance, shade, withAlpha } from './color';
import { accents, activityPalette, inkOnColor, moodColors, themes } from './tokens';

describe('hexToRgb / withAlpha', () => {
  it('lit les formats courts et longs', () => {
    expect(hexToRgb('#FFF')).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb('b4a5ff')).toEqual({ r: 180, g: 165, b: 255 });
    expect(withAlpha('#000000', 0.5)).toBe('rgba(0,0,0,0.5)');
  });
  it('refuse une couleur invalide', () => {
    expect(() => hexToRgb('rouge')).toThrow(RangeError);
  });
});

describe('contrastRatio', () => {
  it('vaut 21 entre noir et blanc, 1 entre deux couleurs identiques', () => {
    expect(contrastRatio('#000', '#FFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#7CB7FF', '#7CB7FF')).toBe(1);
    expect(relativeLuminance('#000')).toBe(0);
  });
});

describe('inkFor', () => {
  it('choisit le texte le plus lisible', () => {
    expect(inkFor('#FFC861')).toBe(inkOnColor.dark);
    expect(inkFor('#16141B')).toBe(inkOnColor.light);
  });
});

// Les tokens eux-mêmes doivent respecter l'exigence WCAG AA (≥ 4,5:1 pour le texte).
describe('contraste des tokens', () => {
  for (const [name, t] of Object.entries(themes)) {
    it(`thème ${name} : textes lisibles sur le fond`, () => {
      for (const ink of [t.ink, t.ink2, t.ink3]) {
        expect(contrastRatio(ink, t.bg)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(ink, t.solid)).toBeGreaterThanOrEqual(4.5);
      }
      expect(contrastRatio(t.inv, t.invInk)).toBeGreaterThanOrEqual(4.5);
    });
  }

  for (const [name, a] of Object.entries(accents)) {
    it(`accent ${name} : lisible partout où il sert de texte`, () => {
      expect(contrastRatio(a.acc, a.accInk)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(a.acc, themes.minuit.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(a.acc, themes.oled.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(a.accTextLight, themes.papier.bg)).toBeGreaterThanOrEqual(4.5);
    });
  }

  it('chaque couleur d’activité ou d’humeur a un texte lisible', () => {
    for (const hex of [...activityPalette.map((c) => c.hex), ...moodColors]) {
      expect(contrastRatio(hex, inkFor(hex))).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('shade', () => {
  it('assombrit et éclaircit', () => {
    expect(shade('#FF8040', -0.5)).toBe('rgb(128,64,32)');
    expect(shade('#000000', 0.5)).toBe('rgb(128,128,128)');
    expect(shade('#B4A5FF', 0)).toBe('rgb(180,165,255)');
  });
});
