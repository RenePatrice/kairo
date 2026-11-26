import { expect, test, type Page } from '@playwright/test';
import { addSlot, onboard } from './helpers';

test.setTimeout(90_000);

// Lundi 23 novembre 2026, 10 h 30 (Europe/Paris).
const MONDAY_1030 = new Date('2026-11-23T10:30:00+01:00');

/**
 * Fausse API Notification : enregistre ce que le système afficherait. `hidden` simule un onglet
 * en arrière-plan (au premier plan, c'est la bannière de l'app qui prévient).
 */
async function fakeNotifications(
  page: Page,
  { permission, hidden }: { permission: string; hidden: boolean },
) {
  await page.addInitScript(
    ({ permission, hidden }) => {
      const w = window as unknown as { __notes: string[] };
      w.__notes = [];
      // Fonction constructeur (appelée avec `new` par l'app) et ses propriétés statiques.
      function FakeNotification(title: string, options?: { body?: string }) {
        w.__notes.push(`${title} — ${options?.body ?? ''}`);
      }
      const api = Object.assign(FakeNotification, {
        permission,
        requestPermission() {
          api.permission = 'granted';
          return Promise.resolve('granted');
        },
      });
      Object.defineProperty(window, 'Notification', {
        value: api,
        configurable: true,
      });
      if (hidden) {
        Object.defineProperty(document, 'visibilityState', {
          get: () => 'hidden',
          configurable: true,
        });
      }
    },
    { permission, hidden },
  );
}

const notes = (page: Page) =>
  page.evaluate(() => (window as unknown as { __notes: string[] }).__notes);

test('« Tester un rappel » demande l’autorisation en contexte, puis notifie', async ({ page }) => {
  await fakeNotifications(page, { permission: 'default', hidden: false });
  await page.clock.install({ time: MONDAY_1030 });
  await onboard(page);
  await addSlot(page);
  expect(await notes(page)).toEqual([]);
  await page.getByRole('button', { name: 'Réglages' }).first().click();
  await page.getByRole('button', { name: 'Tester un rappel' }).click();
  await expect(page.getByText('Salle dans 10 min').first()).toBeVisible();
  await expect.poll(() => notes(page)).toEqual(['Salle dans 10 min — 18:00 – 19:00']);
});

test('onglet en arrière-plan : le rappel programmé sonne à l’heure', async ({ page }) => {
  await fakeNotifications(page, { permission: 'granted', hidden: true });
  await page.clock.install({ time: MONDAY_1030 });
  await onboard(page);
  // 18:00 − 29 quarts d'heure = 10:45 ; rappel 10 min avant, à 10:35.
  await addSlot(page, { steps: -29 });
  await page.waitForTimeout(500);
  expect(await notes(page)).toEqual([]);
  await page.clock.fastForward('06:00');
  await expect.poll(() => notes(page)).toContain('Salle dans 10 min — 10:45 – 11:45');
});

test('sans autorisation, rien n’est envoyé au système', async ({ page }) => {
  await fakeNotifications(page, { permission: 'denied', hidden: true });
  await page.clock.install({ time: MONDAY_1030 });
  await onboard(page);
  await addSlot(page, { steps: -29 });
  await page.clock.fastForward('06:00');
  await page.waitForTimeout(500);
  expect(await notes(page)).toEqual([]);
});
