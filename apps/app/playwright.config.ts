import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5199',
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
  },
  projects: [
    {
      name: 'mobile-375',
      testIgnore: /offline/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 812 } },
    },
    {
      name: 'tablet-768',
      testIgnore: /offline/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 } },
    },
    {
      name: 'desktop-1280',
      testIgnore: /offline/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      // Build de production (service worker) pour le mode hors ligne.
      name: 'pwa',
      testMatch: /offline/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 375, height: 812 },
        baseURL: 'http://localhost:5198',
      },
    },
  ],
  webServer: [
    {
      command: 'pnpm exec vite --port 5199 --strictPort',
      url: 'http://localhost:5199',
      reuseExistingServer: true,
    },
    {
      command: 'pnpm build && pnpm exec vite preview --port 5198 --strictPort',
      url: 'http://localhost:5198',
      reuseExistingServer: true,
      timeout: 180_000,
    },
  ],
});
