import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { addSlot, noHorizontalOverflow, onboard } from './helpers';

test.setTimeout(60_000);

// Lundi 23 novembre 2026, 10 h 30 (Europe/Paris) : résultats reproductibles.
const MONDAY_1030 = new Date('2026-11-23T10:30:00+01:00');

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: MONDAY_1030 });
});

test('semaine personnalisée en moins de 2 minutes, sans compte', async ({ page }, info) => {
  const start = Date.now();
  await onboard(page);
  await addSlot(page);
  expect(Date.now() - start).toBeLessThan(120_000);
  await noHorizontalOverflow(page);
  await page.screenshot({
    path: `test-results/shots/${info.project.name}-week.png`,
    fullPage: true,
  });
});

test('ajoute un créneau, le supprime puis annule', async ({ page }) => {
  await onboard(page);
  await addSlot(page);
  const block = page.getByRole('button', { name: /^Salle.*18:00/ }).first();
  await expect(block).toBeVisible();
  await block.click();
  const sheet = page.getByRole('dialog', { name: 'Modifier le créneau' });
  await sheet.getByRole('button', { name: 'Supprimer' }).click();
  await expect(page.getByText('Créneau supprimé')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Salle.*18:00/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Annuler' }).click();
  await expect(block).toBeVisible();
});

test('Aujourd’hui : check-in d’un créneau terminé', async ({ page }, info) => {
  await onboard(page);
  // 18:00 − 36 quarts d'heure = 09:00–10:00, terminé à 10 h 30.
  await addSlot(page, { steps: -36 });
  await page.getByRole('button', { name: 'Aujourd’hui' }).first().click();
  await expect(page.getByRole('heading', { name: /Bonjour/ })).toBeVisible();
  await expect(page.getByText('Check-in.')).toBeVisible();
  await page.getByRole('button', { name: 'Fait', exact: true }).click();
  await expect(page.getByRole('button', { name: '✓ Fait · Salle' })).toBeVisible();
  await noHorizontalOverflow(page);
  await page.screenshot({
    path: `test-results/shots/${info.project.name}-today.png`,
    fullPage: true,
  });
});

test('réglages : anglais et transparence réduite', async ({ page }) => {
  await onboard(page);
  await page.getByRole('button', { name: 'Réglages' }).first().click();
  await page.getByRole('switch', { name: /Réduire la transparence/ }).click();
  await expect(page.locator('[data-glass]').first()).toHaveAttribute('data-glass', 'solid');
  await page.getByRole('button', { name: /English/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Your');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('accessibilité : aucune violation grave', async ({ page }) => {
  await onboard(page);
  await addSlot(page, { steps: -36 });
  for (const tab of ['Semaine', 'Aujourd’hui', 'Réglages']) {
    await page.getByRole('button', { name: tab }).first().click();
    await page.waitForTimeout(400);
    const { violations } = await new AxeBuilder({ page }).analyze();
    const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(
      serious.map((v) => `${tab}: ${v.id} ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
    ).toEqual([]);
  }
});
