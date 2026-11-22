import { describe, expect, it } from 'vitest';
import {
  glassQualityFor,
  isLowPowerDevice,
  shouldReduceMotion,
  type GlassEnvironment,
} from './detect';

const strong: GlassEnvironment = {
  transparency: 'auto',
  prefersReducedTransparency: false,
  supportsBackdrop: true,
  supportsRefraction: true,
  cores: 8,
  memoryGb: 8,
};

describe('glassQualityFor', () => {
  it('donne le verre complet sur un appareil puissant sous Chromium', () => {
    expect(glassQualityFor(strong)).toBe('full');
  });
  it('passe en surfaces pleines si l’utilisateur réduit la transparence', () => {
    expect(glassQualityFor({ ...strong, transparency: 'reduced' })).toBe('solid');
    expect(glassQualityFor({ ...strong, prefersReducedTransparency: true })).toBe('solid');
  });
  it('passe en surfaces pleines sans support du flou', () => {
    expect(glassQualityFor({ ...strong, supportsBackdrop: false })).toBe('solid');
  });
  it('retire la réfraction hors Chromium ou sur un appareil modeste', () => {
    expect(glassQualityFor({ ...strong, supportsRefraction: false })).toBe('lite');
    expect(glassQualityFor({ ...strong, memoryGb: 2 })).toBe('lite');
    expect(glassQualityFor({ ...strong, cores: 2 })).toBe('lite');
  });
});

describe('isLowPowerDevice', () => {
  it('ne conclut rien sans information', () => {
    expect(isLowPowerDevice({})).toBe(false);
    expect(isLowPowerDevice({ cores: 4, memoryGb: 4 })).toBe(false);
  });
});

describe('shouldReduceMotion', () => {
  it('respecte le réglage de l’app ou la préférence système', () => {
    expect(shouldReduceMotion('auto', false)).toBe(false);
    expect(shouldReduceMotion('auto', true)).toBe(true);
    expect(shouldReduceMotion('reduced', false)).toBe(true);
  });
});
