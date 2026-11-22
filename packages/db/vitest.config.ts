import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: { TZ: 'Europe/Paris' },
    setupFiles: ['fake-indexeddb/auto'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts', 'src/hooks.ts'],
      thresholds: { lines: 90, functions: 90, branches: 85, statements: 90 },
    },
  },
});
