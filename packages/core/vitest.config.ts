import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Fuseau fixe avec changement d'heure, pour des tests reproductibles partout.
    env: { TZ: 'Europe/Paris' },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts'],
      thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 },
    },
  },
});
