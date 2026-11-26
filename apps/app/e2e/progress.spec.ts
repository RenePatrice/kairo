import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { addSlot, noHorizontalOverflow, onboard, settle } from './helpers';

test.setTimeout(90_000);

// Lundi 23 novembre 2026, 10 h 30 (Europe/Paris).
const MONDAY_1030 = new Date('2026-11-23T10:30:00+01:00');

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: MONDAY_1030 });
  await onboard(page);
});

test('après « Fait » : note d’énergie, puis trophée « Premier pas »', async ({ page }, info) => {
  // 09:00–10:00, terminé à 10 h 30.
  await addSlot(page, { steps: -36 });
  await page.getByRole('button', { name: 'Aujourd’hui', exact: true }).first().click();
  await page.getByRole('button', { name: 'Fait', exact: true }).click();
  await expect(page.getByText('Bravo. Comment tu te sens après')).toBeVisible();
  await page.screenshot({
    path: `test-results/shots/${info.project.name}-energy.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'En feu' }).click();
  await expect(page.getByText('Noté. Garde ce rythme !')).toBeVisible();
  await expect(page.getByText('Bravo. Comment tu te sens après')).toBeHidden();
  // L'annonce attend que le message précédent soit parti.
  await expect(page.getByText('Trophée débloqué : Premier pas')).toBeVisible({ timeout: 15_000 });
});

test('objectif du jour : de l’invitation à la carte avec anneau', async ({ page }) => {
  await addSlot(page, { steps: -36 });
  await page.getByRole('button', { name: 'Aujourd’hui', exact: true }).first().click();
  await page.getByRole('button', { name: /Fixe ton cap pour aujourd’hui/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Objectif' });
  await expect(sheet.getByText('1 créneau')).toBeVisible();
  await sheet.getByRole('button', { name: 'Valider le cap' }).click();
  await expect(page.getByText('Objectif du jour fixé')).toBeVisible();
  await expect(page.getByText('Valider 1 créneau')).toBeVisible();
  await expect(page.getByText('0 / 1 créneaux validés')).toBeVisible();
  await page.getByRole('button', { name: 'Fait', exact: true }).click();
  await expect(page.getByText('ATTEINT', { exact: true })).toBeVisible();
});

test('cap de la semaine : courbe sur l’écran Semaine', async ({ page }, info) => {
  await addSlot(page);
  await page.getByRole('button', { name: /Donne un cap à ta semaine/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Objectif' });
  await sheet.getByRole('button', { name: 'Valider le cap' }).click();
  await expect(page.getByText('Cap de la semaine fixé')).toBeVisible();
  await expect(
    page.getByRole('img', { name: 'Progression vers l’objectif de la semaine' }),
  ).toBeVisible();
  await expect(page.getByText('EN RETARD')).toBeVisible();
  await noHorizontalOverflow(page);
  await page.screenshot({ path: `test-results/shots/${info.project.name}-week-goal.png` });
  await settle(page);
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(
    violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id),
  ).toEqual([]);
});

test('récap en stories : 4 écrans, navigation et fermeture', async ({ page }, info) => {
  await page.getByRole('button', { name: '+ Créneau' }).first().click();
  const slot = page.getByRole('dialog', { name: 'Nouveau créneau' });
  await slot.getByRole('button', { name: 'Tous', exact: true }).click();
  await slot.getByRole('button', { name: 'Enregistrer' }).click();
  await page.getByRole('button', { name: 'Bilans' }).first().click();
  await page.getByRole('button', { name: 'Voir avec 8 semaines de démo' }).click();
  await expect(page.getByText('8 semaines simulées')).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: /Ta semaine,/ }).click();

  const recap = page.getByRole('dialog', { name: 'Récap de la semaine' });
  await expect(recap.getByText('Cette semaine, tu as donné')).toBeVisible();
  await page.screenshot({ path: `test-results/shots/${info.project.name}-recap.png` });
  await recap.getByRole('button', { name: 'Écran suivant' }).click();
  await expect(recap.getByText('TON POINT FORT')).toBeVisible();
  await recap.getByRole('button', { name: 'Écran précédent' }).click();
  await expect(recap.getByText('Cette semaine, tu as donné')).toBeVisible();
  for (let i = 0; i < 3; i++) await recap.getByRole('button', { name: 'Écran suivant' }).click();
  await expect(recap.getByText('LA SEMAINE PROCHAINE')).toBeVisible();
  await recap.getByRole('button', { name: 'Ajouter ce créneau' }).click();
  await expect(recap).toBeHidden();
  await expect(page.getByRole('dialog', { name: 'Nouveau créneau' })).toBeVisible();
});
