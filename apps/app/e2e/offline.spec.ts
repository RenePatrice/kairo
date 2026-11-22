import { expect, test } from '@playwright/test';

test('l’app démarre en mode avion après une première visite', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Continuer →' })).toBeVisible();
  // Le service worker a mis l'app en cache.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Continuer →' })).toBeVisible();
  await page.getByRole('button', { name: 'Continuer →' }).click();
  await expect(page.getByRole('heading', { name: /Ton temps/ })).toBeVisible();
});
