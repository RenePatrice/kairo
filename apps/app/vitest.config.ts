import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Les tests de bout en bout tournent avec Playwright (`pnpm e2e`), pas avec Vitest.
    exclude: [...configDefaults.exclude, 'e2e/**'],
    passWithNoTests: true,
  },
});
