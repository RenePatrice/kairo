import { expect, test } from '@playwright/test';
import { onboard, setupBudget } from './helpers';

test.setTimeout(120_000);

// Lundi 23 novembre 2026, 10 h 30 (Europe/Paris).
const MONDAY_1030 = new Date('2026-11-23T10:30:00+01:00');

/**
 * Fausse API Notification installée avant le premier chargement : avec l'horloge simulée,
 * un rechargement de page bloquerait les minuteurs (écran de chargement figé).
 */
test('rappel la veille d’une échéance du Budget', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __notes: string[] };
    w.__notes = [];
    function FakeNotification(title: string) {
      w.__notes.push(title);
    }
    const api = Object.assign(FakeNotification, {
      permission: 'granted',
      requestPermission: () => Promise.resolve('granted'),
    });
    Object.defineProperty(window, 'Notification', { value: api, configurable: true });
    // L'onglet ne passe « en arrière-plan » qu'au moment d'attendre le rappel.
    Object.defineProperty(document, 'visibilityState', {
      get: () => ((window as unknown as { __hidden?: boolean }).__hidden ? 'hidden' : 'visible'),
      configurable: true,
    });
  });
  await page.clock.install({ time: MONDAY_1030 });
  await onboard(page);
  await setupBudget(page);
  await page.getByRole('button', { name: 'Enveloppes' }).first().click();
  await page.getByRole('button', { name: '+ Récurrent' }).click();
  const rec = page.getByRole('dialog', { name: 'Récurrent' });
  await rec.getByLabel('Montant').fill('450');
  await rec.getByRole('button', { name: 'Logement', exact: true }).click();
  await rec.getByRole('button', { name: 'Jour suivant' }).click();
  await rec.getByLabel('Note · facultatif').fill('Loyer');
  await rec.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(rec).toBeHidden();
  // Échéance le 24 : rappel le 23 à 18 h (il est 10 h 30).
  await page.evaluate(() => {
    (window as unknown as { __hidden: boolean }).__hidden = true;
  });
  await page.clock.fastForward('07:31:00');
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __notes: string[] }).__notes))
    .toContainEqual(expect.stringMatching(/^Loyer demain : 450,00/));
});
