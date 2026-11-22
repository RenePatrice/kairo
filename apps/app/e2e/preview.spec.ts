import { expect, test } from '@playwright/test';

test.describe('page de prévisualisation', () => {
  test('s’affiche sans débordement horizontal', async ({ page }, info) => {
    await page.goto('/#preview');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await page.screenshot({ path: `test-results/shots/${info.project.name}-top.png` });
    await page.screenshot({
      path: `test-results/shots/${info.project.name}-full.png`,
      fullPage: true,
    });
    await page
      .locator('section', { has: page.getByRole('heading', { name: /Verre et repli/ }) })
      .screenshot({ path: `test-results/shots/${info.project.name}-glass.png` });
  });

  test('bascule en surfaces pleines quand la transparence est réduite', async ({ page }) => {
    await page.goto('/#preview');
    const controls = page.getByRole('group', { name: 'Transparence' });
    await controls.getByRole('button', { name: 'Réduite' }).click();
    await expect(page.locator('[data-glass="solid"]').first()).toBeVisible();
    await expect(page.locator('[data-glass="regular"]')).toHaveCount(0);
  });

  test('l’IA propose un bloc fantôme, appliqué seulement après validation', async ({ page }) => {
    await page.goto('/#preview');
    await page
      .getByRole('textbox', { name: 'Message à l’assistant' })
      .fill('Ajoute du foot samedi');
    await page.keyboard.press('Enter');
    const ghost = page.getByRole('region', { name: 'Semaine' }).locator('[data-variant="ghost"]');
    await expect(ghost.first()).toBeVisible();
    await page.getByRole('article').getByRole('button', { name: 'Appliquer' }).click();
    await expect(ghost).toHaveCount(0);
    await expect(page.getByRole('status').getByText(/Ajouté · Foot/)).toBeVisible();
    await page.getByRole('button', { name: 'Annuler' }).click();
  });

  test('ouvre la fiche d’un bloc et la referme au clavier', async ({ page }) => {
    await page.goto('/#preview');
    await page.getByRole('region', { name: 'Semaine' }).getByRole('button').first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });

  test('passe en anglais', async ({ page }) => {
    await page.goto('/#preview');
    await page
      .getByRole('group', { name: 'Langue' })
      .getByRole('button', { name: 'English' })
      .click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('The visual');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});
