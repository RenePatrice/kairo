import { expect, type Page } from '@playwright/test';

/** Accueil complet : langue, prénom, rythme, deux activités → écran Semaine. */
export async function onboard(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Continuer →' }).click();
  await page.getByLabel('Ton prénom').fill('Camille');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.getByRole('heading', { name: /rythme/ })).toBeVisible();
  await page.getByRole('button', { name: 'Continuer' }).click();
  const name = page.getByLabel('Nom de l’activité');
  await name.fill('Salle');
  await page.getByRole('button', { name: 'Ajouter : Salle' }).click();
  await name.fill('Révisions');
  await page.getByRole('button', { name: 'Azur' }).click();
  await page.getByRole('button', { name: 'Ajouter : Révisions' }).click();
  await page.getByRole('button', { name: 'Créer mon programme →' }).click();
  await expect(page.getByRole('heading', { name: /semaine/ })).toBeVisible();
}

/** Ouvre la fiche « Nouveau créneau » et décale le début de `steps` quarts d'heure. */
export async function addSlot(
  page: Page,
  { steps = 0, activity }: { steps?: number; activity?: string } = {},
) {
  await page.getByRole('button', { name: '+ Créneau' }).first().click();
  const sheet = page.getByRole('dialog', { name: 'Nouveau créneau' });
  await expect(sheet).toBeVisible();
  if (activity) await sheet.getByRole('button', { name: activity, exact: true }).click();
  const btn = sheet.getByRole('button', { name: steps < 0 ? 'Début plus tôt' : 'Début plus tard' });
  for (let i = 0; i < Math.abs(steps); i++) await btn.click();
  await sheet.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(sheet).toBeHidden();
}

export async function noHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}
