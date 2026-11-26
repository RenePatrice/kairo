import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { noHorizontalOverflow, onboard, settle } from './helpers';

test.setTimeout(90_000);

// Lundi 23 novembre 2026, 10 h 30 (Europe/Paris).
const MONDAY_1030 = new Date('2026-11-23T10:30:00+01:00');

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: MONDAY_1030 });
  await onboard(page);
  await page.getByRole('button', { name: 'Parler à l’assistant' }).first().click();
});

const assistant = (page: Page) => page.getByRole('dialog', { name: 'Assistant' });

async function ask(page: Page, text: string) {
  const box = assistant(page).getByLabel('Message à l’assistant');
  await box.fill(text);
  await box.press('Enter');
}

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
            const rows = req.result as Array<{ deleted: number }>;
            resolve(rows.filter((b) => b.deleted === 0).length);
            open.result.close();
          };
        };
      }),
  );
}

test('accueil : salutation, « Demande-moi de… » et suggestions', async ({ page }, info) => {
  const dlg = assistant(page);
  await expect(dlg.getByRole('heading', { name: /Bonjour, Camille/ })).toBeVisible();
  await expect(dlg.getByText('Je veille sur ton temps.')).toBeVisible();
  await expect(dlg.getByRole('button', { name: /Planifier/ })).toBeVisible();
  await expect(dlg.getByRole('button', { name: 'Essayer' })).toBeVisible();
  await noHorizontalOverflow(page);
  await page.screenshot({ path: `test-results/shots/${info.project.name}-assistant.png` });
});

test('propose un créneau : rien ne change avant « Ajouter », puis annulation', async ({
  page,
}, info) => {
  await ask(page, 'Salle jeudi 7h-8h');
  const dlg = assistant(page);
  await expect(
    dlg.getByText('Parfait. Je cale ça dans « Salle ». Vérifie avant que je l’ajoute :'),
  ).toBeVisible();
  await expect(dlg.getByText('CRÉNEAU', { exact: true })).toBeVisible();
  expect(await liveBlocks(page)).toBe(0);
  await page.screenshot({ path: `test-results/shots/${info.project.name}-assistant-plan.png` });

  await dlg.getByRole('button', { name: 'Ajouter', exact: true }).click();
  await expect(dlg.getByText('✓ Ajouté à ton programme')).toBeVisible();
  await expect(
    dlg.getByText('Ajouté. Je te le rappellerai 10 minutes avant. Autre chose ?'),
  ).toBeVisible();
  expect(await liveBlocks(page)).toBe(1);

  await page.getByRole('button', { name: 'Annuler' }).click();
  await expect(dlg.getByRole('button', { name: 'Ajouter', exact: true })).toBeVisible();
  expect(await liveBlocks(page)).toBe(0);
});

test('repère une nouvelle activité et ouvre « Ajuster » dans la fiche créneau', async ({
  page,
}) => {
  await ask(page, 'Piano mercredi 17h30');
  const dlg = assistant(page);
  await expect(
    dlg.getByText('Nouvelle activité repérée : « Piano ». Je la crée avec son créneau :'),
  ).toBeVisible();
  await expect(dlg.getByText('NOUVEAU', { exact: true })).toBeVisible();
  await dlg.getByRole('button', { name: 'Ajuster' }).click();
  await expect(page.getByRole('dialog', { name: 'Nouveau créneau' })).toBeVisible();
  expect(await liveBlocks(page)).toBe(0);
});

test('moments libres : « Réserver → » ouvre un créneau ponctuel', async ({ page }) => {
  await ask(page, 'Mes moments libres');
  const dlg = assistant(page);
  await expect(dlg.getByText(/Voici tes moments libres aujourd’hui/)).toBeVisible();
  await dlg
    .getByRole('button', { name: /Réserver →/ })
    .first()
    .click();
  await expect(page.getByRole('dialog', { name: 'Nouveau créneau' })).toBeVisible();
});

test('heure manquante, demande trop riche, puis nouvelle conversation', async ({ page }) => {
  const dlg = assistant(page);
  await ask(page, 'Planifie Salle');
  await expect(dlg.getByText(/Il me manque l’heure/)).toBeVisible();
  await dlg.getByRole('button', { name: 'Mes moments libres' }).first().click();
  await expect(dlg.getByText(/Voici tes moments libres aujourd’hui pour Salle/)).toBeVisible();

  await ask(page, 'Construis-moi une semaine d’étudiant');
  await expect(dlg.getByText(/Je ne sais pas encore composer ça seul/)).toBeVisible();

  await dlg.getByRole('button', { name: 'Nouveau fil de discussion' }).click();
  await expect(dlg.getByText('Je veille sur ton temps.')).toBeVisible();
});

test('accessibilité de l’assistant : aucune violation grave', async ({ page }) => {
  test.setTimeout(180_000);
  await ask(page, 'Salle jeudi 7h-8h');
  await expect(assistant(page).getByRole('button', { name: 'Ajuster' })).toBeVisible();
  await settle(page);
  const { violations } = await new AxeBuilder({ page }).analyze();
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(
    serious.map((v) => `${v.id} ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
  ).toEqual([]);
});

test.describe('dictée', () => {
  test.beforeEach(async ({ page }) => {
    // Rechargement avec une fausse reconnaissance vocale : elle « entend » une phrase après 600 ms.
    await page.addInitScript(() => {
      function FakeRecognition(this: Record<string, unknown>) {
        this.start = () => {
          window.setTimeout(() => {
            const onresult = this.onresult as ((e: unknown) => void) | null;
            onresult?.({ results: [[{ transcript: 'Salle jeudi 7h-8h' }]] });
            (this.onend as (() => void) | null)?.();
          }, 600);
        };
        this.stop = () => (this.onend as (() => void) | null)?.();
      }
      for (const k of ['SpeechRecognition', 'webkitSpeechRecognition']) {
        Object.defineProperty(window, k, { value: FakeRecognition, configurable: true });
      }
    });
    await page.reload();
    await page.getByRole('button', { name: 'Parler à l’assistant' }).first().click();
  });

  test('la phrase dictée arrive dans le champ, puis devient une proposition', async ({ page }) => {
    const dlg = assistant(page);
    await dlg.getByRole('button', { name: 'Parler à l’assistant' }).click();
    await expect(dlg.getByText('J’écoute…')).toBeVisible();
    await expect(dlg.getByRole('button', { name: 'Arrêter l’écoute' })).toBeVisible();
    await expect(dlg.getByLabel('Message à l’assistant')).toHaveValue('Salle jeudi 7h-8h');
    await dlg.getByLabel('Message à l’assistant').press('Enter');
    await expect(dlg.getByText(/Je cale ça dans « Salle »/)).toBeVisible();
  });
});

test('sans reconnaissance vocale, le micro est masqué', async ({ page }) => {
  await page.addInitScript(() => {
    for (const k of ['SpeechRecognition', 'webkitSpeechRecognition']) {
      Object.defineProperty(window, k, { value: undefined, configurable: true });
    }
  });
  await page.reload();
  await page.getByRole('button', { name: 'Parler à l’assistant' }).first().click();
  const dlg = assistant(page);
  await expect(dlg.getByLabel('Message à l’assistant')).toBeVisible();
  await expect(dlg.getByRole('button', { name: 'Parler à l’assistant' })).toHaveCount(0);
});
