import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { noHorizontalOverflow, onboard, settle } from './helpers';

test.setTimeout(120_000);

// Lundi 23 novembre 2026, 10 h 30 (Europe/Paris).
const MONDAY_1030 = new Date('2026-11-23T10:30:00+01:00');

/** Montant affiché en français, quel que soit l'espace insécable utilisé (« 1 000,00 € »). */
const eur = (text: string) =>
  new RegExp(text.replace(/ /g, '[\\s\\u00a0\\u202f]?').replace('€', '[\\s\\u00a0\\u202f]?€'));

async function setupBudget(page: Page) {
  await page
    .getByRole('group', { name: 'Choisir l’app' })
    .getByRole('button', { name: 'Budget' })
    .click();
  await expect(page.getByRole('heading', { name: /Ton argent/ })).toBeVisible();
  await page.getByRole('button', { name: 'EUR', exact: true }).click();
  await page.getByLabel('Solde actuel · facultatif').fill('1000');
  await page.getByLabel('Espèces sur toi · facultatif').fill('50');
  await page.getByRole('button', { name: 'Commencer →' }).click();
  await expect(page.getByRole('heading', { name: /Ton budget/ })).toBeVisible();
}

async function addTransaction(
  page: Page,
  {
    kind = 'Dépense',
    amount,
    category,
    monthly = false,
    note,
  }: { kind?: string; amount: string; category?: string; monthly?: boolean; note?: string },
) {
  await page.getByRole('button', { name: 'Ajouter une opération' }).first().click();
  const sheet = page.getByRole('dialog', { name: 'Opération' });
  await sheet.getByRole('button', { name: kind, exact: true }).click();
  await sheet.getByLabel('Montant').fill(amount);
  if (category) await sheet.getByRole('button', { name: category, exact: true }).click();
  if (note) await sheet.getByLabel('Note · facultatif').fill(note);
  if (monthly) await sheet.getByRole('switch', { name: /Chaque mois/ }).click();
  await sheet.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(sheet).toBeHidden();
}

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: MONDAY_1030 });
  await onboard(page);
});

test('configure le Budget, ajoute une dépense et revient au mode Temps', async ({ page }, info) => {
  await setupBudget(page);
  await expect(page.getByText(eur('Solde total 1 050,00 €'))).toBeVisible();
  await addTransaction(page, { amount: '12,50', category: 'Courses' });
  await expect(page.getByText('Opération ajoutée')).toBeVisible();
  await expect(page.getByRole('button', { name: /Courses.*12,50/ })).toBeVisible();
  await expect(page.getByText(eur('Solde total 1 037,50 €'))).toBeVisible();
  await noHorizontalOverflow(page);
  await page.screenshot({
    path: `test-results/shots/${info.project.name}-budget-home.png`,
    fullPage: true,
  });

  await page
    .getByRole('group', { name: 'Choisir l’app' })
    .getByRole('button', { name: 'Temps' })
    .click();
  await expect(page.getByRole('heading', { name: /semaine/ })).toBeHidden();
  await expect(page.getByRole('heading', { name: /Bonjour/ })).toBeVisible();
});

test('revenu mensuel, virement entre comptes, puis modification et suppression', async ({
  page,
}) => {
  await setupBudget(page);
  await addTransaction(page, {
    kind: 'Revenu',
    amount: '1500',
    category: 'Salaire',
    monthly: true,
  });
  await expect(page.getByText('Prochaines échéances')).toBeVisible();
  await expect(page.getByText(eur('Solde total 2 550,00 €'))).toBeVisible();

  await addTransaction(page, { kind: 'Virement', amount: '20' });
  await expect(page.getByRole('button', { name: /Compte principal → Espèces/ })).toBeVisible();
  await expect(page.getByText(eur('Solde total 2 550,00 €'))).toBeVisible();

  await page.getByRole('button', { name: /Compte principal → Espèces/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Opération' });
  await expect(sheet.getByLabel('Montant')).toHaveValue('20,00');
  await sheet.getByRole('button', { name: 'Supprimer' }).click();
  await expect(page.getByRole('button', { name: /Compte principal → Espèces/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Annuler' }).click();
  await expect(page.getByRole('button', { name: /Compte principal → Espèces/ })).toBeVisible();
});

test('refuse une opération sans montant ou sans catégorie', async ({ page }) => {
  await setupBudget(page);
  await page.getByRole('button', { name: 'Ajouter une opération' }).first().click();
  const sheet = page.getByRole('dialog', { name: 'Opération' });
  await sheet.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByText('Indique un montant')).toBeVisible();
  await sheet.getByLabel('Montant').fill('8');
  await sheet.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByText('Choisis une catégorie')).toBeVisible();
  await expect(sheet).toBeVisible();
});

test('accessibilité du Budget : aucune violation grave', async ({ page }) => {
  test.setTimeout(180_000);
  await page
    .getByRole('group', { name: 'Choisir l’app' })
    .getByRole('button', { name: 'Budget' })
    .click();
  await settle(page);
  let { violations } = await new AxeBuilder({ page }).analyze();
  expect(
    violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id),
  ).toEqual([]);
  await page.getByRole('button', { name: 'EUR', exact: true }).click();
  await page.getByRole('button', { name: 'Commencer →' }).click();
  await addTransaction(page, { amount: '9,90', category: 'Loisirs' });
  await settle(page);
  ({ violations } = await new AxeBuilder({ page }).analyze());
  expect(
    violations
      .filter((v) => v.impact === 'serious' || v.impact === 'critical')
      .map((v) => `${v.id} ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
  ).toEqual([]);
});

test('opérations : regroupées par jour, filtres et recherche', async ({ page }, info) => {
  await setupBudget(page);
  await addTransaction(page, { amount: '12,50', category: 'Courses', note: 'Marché' });
  await addTransaction(page, { amount: '8', category: 'Transport', note: 'Taxi' });
  await addTransaction(page, { kind: 'Revenu', amount: '1500', category: 'Salaire' });
  await page.getByRole('button', { name: 'Opérations' }).first().click();
  await expect(page.getByRole('heading', { name: /Tes opérations/ })).toBeVisible();
  await expect(page.getByText(/^Lundi 23 nov/)).toBeVisible();
  const rows = page.getByRole('main').getByRole('button', { name: /€/ });
  await expect(rows).toHaveCount(3);

  await page
    .getByRole('group', { name: 'Filtrer par catégorie' })
    .getByRole('button', { name: 'Transport' })
    .click();
  await expect(rows).toHaveCount(1);
  await expect(page.getByRole('button', { name: /Transport.*Taxi/ })).toBeVisible();
  await page
    .getByRole('group', { name: 'Filtrer par catégorie' })
    .getByRole('button', { name: 'Toutes' })
    .click();

  await page.getByLabel('Rechercher une opération').fill('marche');
  await expect(rows).toHaveCount(1);
  await expect(page.getByRole('button', { name: /Courses.*Marché/ })).toBeVisible();
  await noHorizontalOverflow(page);
  await page.screenshot({
    path: `test-results/shots/${info.project.name}-budget-ops.png`,
    fullPage: true,
  });
});

test('comptes : ajout à découvert, puis suppression annulée', async ({ page }) => {
  await setupBudget(page);
  await page.getByRole('button', { name: '+ Compte' }).click();
  const sheet = page.getByRole('dialog', { name: 'Compte' });
  await sheet.getByLabel('Nom').fill('Mobile');
  await sheet.getByRole('button', { name: 'Mobile money' }).click();
  await sheet.getByLabel('Solde de départ').fill('-50');
  await sheet.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByText('Compte ajouté')).toBeVisible();
  const row = page.getByRole('button', { name: /^Mobile Mobile money/ });
  await expect(row).toContainText(/-50,00/);
  await expect(page.getByText(eur('Solde total 1 000,00 €'))).toBeVisible();

  await row.click();
  await expect(sheet.getByLabel('Solde de départ')).toHaveValue('-50,00');
  await sheet.getByRole('button', { name: 'Supprimer' }).click();
  await expect(row).toHaveCount(0);
  await page.getByRole('button', { name: 'Annuler' }).click();
  await expect(row).toBeVisible();
});

test('enveloppes : plafond, alerte à 80 %, échéance récurrente en pause', async ({
  page,
}, info) => {
  await setupBudget(page);
  await page.getByRole('button', { name: 'Enveloppes' }).first().click();
  await expect(page.getByRole('heading', { name: /Tes enveloppes/ })).toBeVisible();
  await page
    .getByRole('main')
    .getByRole('button', { name: /^Courses/ })
    .click();
  const cat = page.getByRole('dialog', { name: 'Catégorie' });
  await cat.getByLabel('Plafond mensuel · facultatif').fill('20');
  await cat.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByText('Catégorie modifiée')).toBeVisible();
  await expect(page.getByRole('main').getByRole('button', { name: /^Courses/ })).toContainText(
    /reste 20,00/,
  );

  await addTransaction(page, { amount: '17', category: 'Courses' });
  await expect(page.getByText('Courses : 85 % de l’enveloppe')).toBeVisible();
  await expect(page.getByRole('main').getByRole('button', { name: /^Courses/ })).toContainText(
    'BIENTÔT',
  );

  await page.getByRole('button', { name: '+ Récurrent' }).click();
  const rec = page.getByRole('dialog', { name: 'Récurrent' });
  await rec.getByLabel('Montant').fill('450');
  await rec.getByRole('button', { name: 'Logement', exact: true }).click();
  await rec.getByLabel('Note · facultatif').fill('Loyer');
  await rec.getByRole('button', { name: 'Enregistrer' }).click();
  const loyer = page.getByRole('button', { name: /^Loyer le 23 de chaque mois/ });
  await expect(loyer).toBeVisible();
  await noHorizontalOverflow(page);
  await page.screenshot({
    path: `test-results/shots/${info.project.name}-budget-envelopes.png`,
    fullPage: true,
  });

  await loyer.click();
  await rec.getByRole('switch', { name: /Active/ }).click();
  await rec.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByRole('button', { name: /^Loyer.*en pause/ })).toBeVisible();
});
