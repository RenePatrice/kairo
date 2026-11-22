import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { KairoDB } from './database';
import { uuidv7 } from './ids';
import {
  addCategory,
  addChecks,
  capitalize,
  copyDayBlocks,
  deleteBlock,
  deleteCategory,
  getSettings,
  listBlocks,
  listCategories,
  readChecks,
  resetAll,
  saveBlock,
  setCheck,
  toggleRestDay,
  toggleStep,
  updateCategory,
  updateOptions,
  updateProfile,
  updateSettings,
  type BlockDraft,
} from './repo';

let db: KairoDB;
let n = 0;
beforeEach(() => {
  db = new KairoDB(`test-${++n}`);
});
afterEach(async () => {
  await db.delete();
});

const draft = (categoryId: string, patch: Partial<BlockDraft> = {}): BlockDraft => ({
  categoryId,
  days: [1, 3],
  once: null,
  startMin: 1080,
  endMin: 1140,
  reminderMin: 10,
  steps: [],
  note: '',
  ...patch,
});

describe('identifiants', () => {
  it('produit des UUID v7 triables par date', () => {
    const a = uuidv7(1_700_000_000_000);
    const b = uuidv7(1_700_000_000_001);
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(a < b).toBe(true);
  });
});

describe('réglages', () => {
  it('renvoie les valeurs par défaut de la maquette', async () => {
    const s = await getSettings(db);
    expect(s).toMatchObject({ locale: null, started: false, theme: 'minuit', accent: 'lav' });
    expect(s.profile).toMatchObject({ wakeMin: 420, sleepMin: 1410 });
    expect(s.options).toMatchObject({ solid: false, remind: true, local: true, haptic: true });
  });

  it('enregistre langue, profil et options', async () => {
    await updateSettings(db, { locale: 'en' });
    await updateProfile(db, { name: 'Camille', wakeMin: 360 });
    await updateOptions(db, { clock12: true });
    const s = await getSettings(db);
    expect(s.locale).toBe('en');
    expect(s.profile).toMatchObject({ name: 'Camille', wakeMin: 360, sleepMin: 1410 });
    expect(s.options.clock12).toBe(true);
    expect(s.options.haptic).toBe(true);
  });
});

describe('activités', () => {
  it('ajoute, renomme et ordonne', async () => {
    const a = await addCategory(db, { name: ' salle', color: '#B4A5FF', weeklyGoalH: 5 });
    const b = await addCategory(db, { name: 'gardes', color: '#7CB7FF', weeklyGoalH: 0 });
    expect(a.name).toBe('Salle');
    expect(b.order).toBe(a.order + 1);
    await updateCategory(db, a.id, { name: 'muscu', color: '#5EE0D2', weeklyGoalH: 6 });
    const list = await listCategories(db);
    expect(list.map((c) => c.name)).toEqual(['Muscu', 'Gardes']);
    expect(list[0]?.weeklyGoalH).toBe(6);
  });

  it('refuse une couleur invalide ou une activité inconnue', async () => {
    await expect(addCategory(db, { name: 'x', color: 'red', weeklyGoalH: 1 })).rejects.toThrow();
    await expect(
      updateCategory(db, 'nope', { name: 'x', color: '#FFFFFF', weeklyGoalH: 1 }),
    ).rejects.toThrow(/inconnue/);
  });

  it('supprime une activité avec ses créneaux, et annule', async () => {
    const a = await addCategory(db, { name: 'Salle', color: '#B4A5FF', weeklyGoalH: 5 });
    await saveBlock(db, draft(a.id));
    const undo = await deleteCategory(db, a.id);
    expect(await listCategories(db)).toEqual([]);
    expect(await listBlocks(db)).toEqual([]);
    await undo();
    expect(await listCategories(db)).toHaveLength(1);
    expect(await listBlocks(db)).toHaveLength(1);
  });
});

describe('créneaux', () => {
  it('enregistre un créneau récurrent propre', async () => {
    const b = await saveBlock(db, draft('c', { days: [3, 1, 3], steps: [' a ', ''], note: ' x ' }));
    expect(b.days).toEqual([1, 3]);
    expect(b.steps).toEqual(['a']);
    expect(b.note).toBe('x');
    const again = await saveBlock(db, { ...b, startMin: 1000 });
    expect(again.id).toBe(b.id);
    expect(await listBlocks(db)).toHaveLength(1);
  });

  it('vide les jours d’un créneau ponctuel', async () => {
    const b = await saveBlock(db, draft('c', { once: '2026-11-28' }));
    expect(b.days).toEqual([]);
  });

  it('refuse un créneau sans jour ou hors bornes', async () => {
    await expect(saveBlock(db, draft('c', { days: [] }))).rejects.toThrow(/jour/);
    await expect(saveBlock(db, draft('c', { startMin: 1440 }))).rejects.toThrow();
  });

  it('supprime et annule', async () => {
    const b = await saveBlock(db, draft('c'));
    const undo = await deleteBlock(db, b.id);
    expect(await listBlocks(db)).toEqual([]);
    await undo();
    expect(await listBlocks(db)).toHaveLength(1);
  });

  it('copie un jour et annule', async () => {
    const b = await saveBlock(db, draft('c', { days: [1] }));
    await saveBlock(db, draft('c', { once: '2026-11-24' }));
    const undo = await copyDayBlocks(db, 1, [4, 5]);
    expect((await db.blocks.get(b.id))?.days).toEqual([1, 4, 5]);
    await undo();
    expect((await db.blocks.get(b.id))?.days).toEqual([1]);
  });
});

describe('check-in', () => {
  it('valide, rate et annule', async () => {
    await setCheck(db, '2026-11-23', 'b1', 'done');
    await setCheck(db, '2026-11-23', 'b2', 'missed');
    expect(await readChecks(db)).toEqual({ '2026-11-23|b1': 'done', '2026-11-23|b2': 'missed' });
    await setCheck(db, '2026-11-23', 'b1', null);
    expect(await readChecks(db)).toEqual({ '2026-11-23|b2': 'missed' });
  });

  it('ajoute des check-ins en lot sans écraser', async () => {
    await setCheck(db, '2026-11-23', 'b1', 'missed');
    await addChecks(db, { '2026-11-23|b1': 'done', '2026-11-22|b1': 'done' });
    expect(await readChecks(db)).toEqual({ '2026-11-23|b1': 'missed', '2026-11-22|b1': 'done' });
  });

  it('coche et décoche des étapes', async () => {
    expect(await toggleStep(db, '2026-11-23', 'b', 2)).toEqual([2]);
    expect(await toggleStep(db, '2026-11-23', 'b', 0)).toEqual([0, 2]);
    expect(await toggleStep(db, '2026-11-23', 'b', 2)).toEqual([0]);
  });

  it('bascule une journée off', async () => {
    expect(await toggleRestDay(db, '2026-11-23')).toBe(true);
    expect(await toggleRestDay(db, '2026-11-23')).toBe(false);
  });
});

describe('tout effacer', () => {
  it('revient à l’accueil en gardant langue et ambiance', async () => {
    await updateSettings(db, { locale: 'en', theme: 'papier', started: true });
    await updateProfile(db, { name: 'Camille' });
    const a = await addCategory(db, { name: 'Salle', color: '#B4A5FF', weeklyGoalH: 5 });
    await saveBlock(db, draft(a.id));
    await resetAll(db);
    const s = await getSettings(db);
    expect(s).toMatchObject({ locale: 'en', theme: 'papier', started: false });
    expect(s.profile.name).toBe('');
    expect(await listCategories(db)).toEqual([]);
  });

  it('met une majuscule', () => {
    expect(capitalize('  salle de sport ')).toBe('Salle de sport');
  });
});
