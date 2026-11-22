import { describe, expect, it } from 'vitest';
import { buildTokensCss, scaleAlpha } from './css';

describe('scaleAlpha', () => {
  it('multiplie l’opacité', () => {
    expect(scaleAlpha('rgba(255,255,255,0.1)', 0.5)).toBe('rgba(255,255,255,0.05)');
    expect(() => scaleAlpha('#fff', 2)).toThrow(RangeError);
  });
});

describe('tokens.css', () => {
  // Échoue si tokens.ts a changé sans régénérer le CSS : `pnpm --filter @kairo/ui gen:css`.
  it('est à jour avec tokens.ts', async () => {
    await expect(buildTokensCss()).toMatchFileSnapshot('./styles/tokens.css');
  });
});
