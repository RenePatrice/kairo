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
  await expect(page.getByText('8 semaines simulées')).toBeVisible();
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

test('bilan du jour : note obligatoire, brouillon de l’IA, puis enregistrement', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Voir avec 8 semaines de démo' }).click();
  await expect(page.getByText('8 semaines simulées')).toBeVisible();
  await page.getByRole('group', { name: 'Bilans' }).getByRole('button', { name: 'Jour' }).click();
  await page.getByRole('button', { name: /^Aujourd’hui \d+/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Bilan' });
  await expect(sheet.getByText('Comment s’est passée ta journée ?')).toBeVisible();
  await sheet.getByRole('button', { name: 'Enregistrer le bilan' }).click();
  await expect(page.getByText('Choisis d’abord une note')).toBeVisible();
  await sheet.getByRole('button', { name: 'Laisser l’IA rédiger le bilan' }).click();
  await expect(sheet.getByText('Analyse de l’IA · modifiable')).toBeVisible();
  await expect(sheet.getByRole('button', { name: 'Régénérer avec l’IA' })).toBeVisible();
  await sheet.getByRole('button', { name: 'Enregistrer le bilan' }).click();
  await expect(sheet).toBeHidden();
  await expect(page.getByText('Journée bouclée. À demain !')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Aujourd’hui \d+.*✦ IA ·/ })).toBeVisible();
});

test('bilan de la semaine : le cap proposé devient l’objectif suivant', async ({ page }, info) => {
  await page.getByRole('button', { name: 'Faire le bilan de la semaine' }).click();
  const sheet = page.getByRole('dialog', { name: 'Bilan' });
  await sheet.getByRole('button', { name: 'Laisser l’IA rédiger le bilan' }).click();
  await expect(sheet.getByLabel('Ton cap pour la semaine prochaine')).not.toHaveValue('');
  await sheet.getByRole('button', { name: 'Top' }).click();
  await page.screenshot({ path: `test-results/shots/${info.project.name}-review-sheet.png` });
  await sheet.getByRole('button', { name: 'Enregistrer le bilan' }).click();
  await expect(page.getByText('Semaine bouclée. Nouveau cap prêt.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Revoir mon bilan de la semaine' })).toBeVisible();
});

test('cap de la semaine depuis l’assistant : régularité, puis retrait', async ({ page }, info) => {
  await page.getByRole('button', { name: 'Voir avec 8 semaines de démo' }).click();
  await expect(page.getByText('8 semaines simulées')).toBeVisible();
  await page.getByRole('button', { name: 'Parler à l’assistant' }).first().click();
  const box = page.getByLabel('Message à l’assistant');
  await box.fill('Analyse ma semaine');
  await box.press('Enter');
  await page.getByRole('button', { name: 'Fixer mon cap' }).click();
  const sheet = page.getByRole('dialog', { name: 'Objectif' });
  await sheet.getByRole('button', { name: 'Régularité' }).click();
  await expect(sheet.getByText('80 %')).toBeVisible();
  await sheet.getByRole('button', { name: 'Augmenter la cible' }).click();
  await expect(sheet.getByText('85 %')).toBeVisible();
  await page.screenshot({ path: `test-results/shots/${info.project.name}-goal-sheet.png` });
  await sheet.getByRole('button', { name: 'Valider le cap' }).click();
  await expect(page.getByText('Cap de la semaine fixé')).toBeVisible();
  await expect(sheet).toBeHidden();

  await page.getByRole('button', { name: 'Fixer mon cap' }).click();
  await expect(sheet.getByText('85 %')).toBeVisible();
  await sheet.getByRole('button', { name: 'Retirer' }).click();
  await expect(sheet).toBeHidden();
});
