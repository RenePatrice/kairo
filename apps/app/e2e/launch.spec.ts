import { expect, test } from '@playwright/test';

test.setTimeout(60_000);

// Lundi 23 novembre 2026, 10 h 30 (Europe/Paris).
const MONDAY_1030 = new Date('2026-11-23T10:30:00+01:00');

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: MONDAY_1030 });
});

test('écran de chargement : logo et signature, puis l’app', async ({ page }, info) => {
  await page.goto('/');
  const splash = page.getByRole('status', { name: 'Chargement de Kairo' });
  await expect(splash).toBeVisible();
  await expect(splash.getByText('René Patrice · Copyright © 2026')).toBeVisible();
  await page.screenshot({ path: `test-results/shots/${info.project.name}-splash.png` });
  await expect(splash).toBeHidden({ timeout: 10_000 });
  await expect(page.getByRole('button', { name: 'Continuer →' })).toBeVisible();
});

test('accueil : impossible de continuer sans prénom', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Continuer →' }).click();
  await expect(page.getByRole('heading', { name: /Ton temps/ })).toBeVisible();
  const name = page.getByLabel('Ton prénom');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.getByRole('alert')).toHaveText('Écris ton prénom pour continuer');
  await expect(name).toHaveAttribute('aria-invalid', 'true');
  await expect(name).toBeFocused();
  await expect(page.getByRole('heading', { name: /Ton temps/ })).toBeVisible();

  // Des espaces seuls ne comptent pas comme un prénom.
  await name.fill('   ');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.getByRole('heading', { name: /Ton temps/ })).toBeVisible();

  await name.fill('Camille');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.getByRole('heading', { name: /rythme/ })).toBeVisible();
});
