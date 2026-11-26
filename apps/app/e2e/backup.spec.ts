import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { addSlot, onboard } from './helpers';

test.setTimeout(90_000);

// Lundi 23 novembre 2026, 10 h 30 (Europe/Paris).
const MONDAY_1030 = new Date('2026-11-23T10:30:00+01:00');

/** Créneaux non supprimés dans la base locale (IndexedDB « kairo »). */
function liveBlocks(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const open = indexedDB.open('kairo');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const req = open.result.transaction('blocks').objectStore('blocks').getAll();
          req.onerror = () => reject(req.error);
          req.onsuccess = () => {
            resolve(
              (req.result as Array<{ deleted: number }>).filter((b) => b.deleted === 0).length,
            );
            open.result.close();
          };
        };
      }),
  );
}

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: MONDAY_1030 });
  await onboard(page);
  await addSlot(page);
  await page.getByRole('button', { name: 'Réglages' }).first().click();
});

test('enregistre une sauvegarde, la restaure, puis annule', async ({ page }) => {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Enregistrer une sauvegarde' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('kairo-sauvegarde-2026-11-23.json');
  const file = await download.path();
  const json = JSON.parse(await readFile(file, 'utf8')) as { app: string; blocks: unknown[] };
  expect(json).toMatchObject({ app: 'kairo' });
  expect(json.blocks).toHaveLength(1);
  await expect(page.getByText('Sauvegarde enregistrée')).toBeVisible();

  // Un second créneau, puis retour à la sauvegarde (un seul créneau).
  await page.getByRole('button', { name: 'Semaine', exact: true }).first().click();
  await addSlot(page, { steps: -8 });
  expect(await liveBlocks(page)).toBe(2);
  await page.getByRole('button', { name: 'Réglages' }).first().click();
  await page.getByLabel('Restaurer une sauvegarde').setInputFiles(file);
  await expect(page.getByText('Sauvegarde restaurée')).toBeVisible();
  await expect.poll(() => liveBlocks(page)).toBe(1);

  await page.getByRole('button', { name: 'Annuler' }).click();
  await expect.poll(() => liveBlocks(page)).toBe(2);
});

test('refuse un fichier qui n’est pas une sauvegarde Kairo', async ({ page }) => {
  await page.getByLabel('Restaurer une sauvegarde').setInputFiles({
    name: 'notes.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"hello":"world"}'),
  });
  await expect(page.getByText('Ce fichier n’est pas une sauvegarde Kairo')).toBeVisible();
  expect(await liveBlocks(page)).toBe(1);
});
