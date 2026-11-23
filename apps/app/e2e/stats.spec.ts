import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { addSlot, noHorizontalOverflow, onboard } from './helpers';

test.setTimeout(90_000);

// Lundi 23 novembre 2026, 10 h 30 (Europe/Paris).
const MONDAY_1030 = new Date('2026-11-23T10:30:00+01:00');

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: MONDAY_1030 });
  await onboard(page);
  // Un créneau chaque jour de la semaine : la démo a de quoi remplir 8 semaines.
  await page.getByRole('button', { name: '+ Créneau' }).first().click();
  const sheet = page.getByRole('dialog', { name: 'Nouveau créneau' });
  await sheet.getByRole('button', { name: 'Tous', exact: true }).click();
  await sheet.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(sheet).toBeHidden();
  await addSlot(page, { steps: -40, activity: 'Révisions' });
  await page.getByRole('button', { name: 'Bilans' }).first().click();
});

test('état vide, puis 8 semaines de démo', async ({ page }, info) => {
  await expect(page.getByText('Tes stats')).toBeVisible();
  await page.getByRole('button', { name: 'Voir avec 8 semaines de démo' }).click();
  await expect(page.getByText('8 semaines simulées')).toBeVisible();
  await expect(page.getByRole('button', { name: /Ta semaine,/ })).toBeVisible();
  await expect(page.getByText('Régularité 7 j')).toBeVisible();
  await expect(page.getByText('Régularité · 5 semaines')).toBeVisible();
  await expect(page.getByText('Ton énergie selon le moment')).toBeVisible();
  await expect(page.getByText('Mon analyse —')).toBeVisible();
  await expect(page.getByRole('img', { name: /Heures réalisées par semaine/ })).toBeVisible();
  await noHorizontalOverflow(page);
  await page.screenshot({
    path: `test-results/shots/${info.project.name}-stats-week.png`,
    fullPage: true,
  });

  await page.getByRole('group', { name: 'Bilans' }).getByRole('button', { name: 'Jour' }).click();
  await expect(page.getByText('14 derniers jours')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Hier \d+/ })).toBeVisible();
  await page.screenshot({
    path: `test-results/shots/${info.project.name}-stats-day.png`,
    fullPage: true,
  });

  await page
    .getByRole('group', { name: 'Bilans' })
    .getByRole('button', { name: 'Trophées' })
    .click();
  await expect(page.getByText('Ta collection')).toBeVisible();
  await expect(page.getByText('Premier pas')).toBeVisible();
  await page.screenshot({
    path: `test-results/shots/${info.project.name}-stats-trophy.png`,
    fullPage: true,
  });
});

test('accessibilité des Bilans : aucune violation grave', async ({ page }) => {
  test.setTimeout(180_000);
  await page.getByRole('button', { name: 'Voir avec 8 semaines de démo' }).click();
  await expect(page.getByText('Régularité 7 j')).toBeVisible();
  for (const tab of ['Semaine', 'Jour', 'Trophées']) {
    await page.getByRole('group', { name: 'Bilans' }).getByRole('button', { name: tab }).click();
    await page.waitForTimeout(300);
    const { violations } = await new AxeBuilder({ page }).analyze();
    const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(
      serious.map((v) => `${tab}: ${v.id} ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
    ).toEqual([]);
  }
});
