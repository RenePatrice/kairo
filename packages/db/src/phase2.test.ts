import type { AiSuggestion } from '@kairo/ai';
import { Dexie } from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { exportBackup, parseBackup, restoreBackup } from './backup';
import { KairoDB } from './database';
import {
  addEnergyLevels,
  addGoals,
  addReviews,
  countFocusSession,
  deleteGoal,
  markTrophiesSeen,
  readEnergy,
  saveGoal,
  saveReview,
  setEnergy,
} from './progress';
import { addCategory, getSettings, listBlocks, listCategories, saveBlock } from './repo';
import { DB_VERSION, defaultSettings } from './schema';
import { SuggestionError, applySuggestion, dismissSuggestion, saveSuggestion } from './suggestions';

let db: KairoDB;
let n = 0;
beforeEach(() => {
  db = new KairoDB(`phase2-${++n}`);
});
afterEach(async () => {
  await db.delete();
});

describe('migration v1 → v2', () => {
  it('ajoute les tables et complète les réglages existants', async () => {
    const name = `migration-${n}`;
    const v1 = new Dexie(name);
    v1.version(1).stores({
      categories: 'id, order, deleted',
      blocks: 'id, categoryId, deleted',
      completions: 'id, date, blockId',
      stepProgress: 'id',
      restDays: 'date',
      settings: 'id',
    });
    const old: Record<string, unknown> = { ...defaultSettings(), schemaVersion: 1, started: true };
    delete old.trophiesSeen;
    delete old.focusCount;
    await v1.table('settings').put(old);
    v1.close();

    const v2 = new KairoDB(name);
    const s = await getSettings(v2);
    expect(s).toMatchObject({ started: true, trophiesSeen: [], focusCount: 0, schemaVersion: 2 });
    expect(v2.verno).toBe(DB_VERSION);
    expect(await v2.suggestions.count()).toBe(0);
    await v2.delete();
  });
});

describe('suivi', () => {
  it('note l’énergie d’un créneau', async () => {
    await setEnergy(db, '2026-11-23', 'b1', 3);
    await setEnergy(db, '2026-11-23', 'b1', 2);
    expect(await readEnergy(db)).toEqual({ '2026-11-23|b1': 2 });
  });

  it('enregistre et supprime les objectifs du jour et de la semaine', async () => {
    await saveGoal(db, {
      id: 'D2026-11-23',
      scope: 'D',
      kind: 'blocks',
      target: 3,
      text: ' Tout ',
    });
    await saveGoal(db, {
      id: 'W2026-48',
      scope: 'W',
      kind: 'act',
      target: 5,
      categoryId: 'c1',
      text: '',
    });
    expect(await db.goals.get('D2026-11-23')).toMatchObject({ text: 'Tout', target: 3 });
    await deleteGoal(db, 'D2026-11-23');
    expect(await db.goals.count()).toBe(1);
  });

  it('refuse un objectif mal formé', async () => {
    await expect(
      saveGoal(db, { id: 'W2026-48', scope: 'D', kind: 'blocks', target: 1, text: '' }),
    ).rejects.toThrow();
  });

  it('enregistre les bilans, sans écraser ceux qui existent en lot', async () => {
    await saveReview(db, {
      id: 'D2026-11-22',
      mood: 4,
      a: ' Salle ',
      b: '',
      summary: '',
      ai: false,
    });
    const added = await addReviews(db, [
      { id: 'D2026-11-22', mood: 1, a: 'IA', b: '', summary: '', ai: true },
      { id: 'W2026-47', mood: 5, a: 'IA', b: '', summary: 'Semaine à 93 %', ai: true },
    ]);
    expect(added).toBe(1);
    expect(await db.reviews.get('D2026-11-22')).toMatchObject({ mood: 4, a: 'Salle', ai: false });
    expect(await db.reviews.get('W2026-47')).toMatchObject({ ai: true });
  });

  it('ajoute énergie et objectifs en lot sans écraser', async () => {
    await setEnergy(db, '2026-11-22', 'a', 1);
    await addEnergyLevels(db, { '2026-11-22|a': 3, '2026-11-21|a': 2 });
    expect(await readEnergy(db)).toEqual({ '2026-11-22|a': 1, '2026-11-21|a': 2 });
    await saveGoal(db, {
      id: 'W2026-47',
      scope: 'W',
      kind: 'rate',
      target: 90,
      categoryId: null,
      text: '',
    });
    await addGoals(db, [
      { id: 'W2026-47', scope: 'W', kind: 'hours', target: 5, categoryId: null, text: '' },
      { id: 'D2026-11-20', scope: 'D', kind: 'blocks', target: 2, text: '' },
    ]);
    expect(await db.goals.get('W2026-47')).toMatchObject({ kind: 'rate' });
    expect(await db.goals.count()).toBe(2);
  });

  it('retient les trophées vus et compte les sessions focus', async () => {
    await markTrophiesSeen(db, ['first']);
    await markTrophiesSeen(db, ['first', 'h10']);
    await markTrophiesSeen(db, []);
    expect(await countFocusSession(db)).toBe(1);
    expect(await countFocusSession(db)).toBe(2);
    expect(await getSettings(db)).toMatchObject({ trophiesSeen: ['first', 'h10'], focusCount: 2 });
  });
});

async function baseline() {
  const salle = await addCategory(db, { name: 'Salle', color: '#B4A5FF', weeklyGoalH: 5 });
  const block = await saveBlock(db, {
    categoryId: salle.id,
    days: [1, 3],
    once: null,
    startMin: 1080,
    endMin: 1140,
    reminderMin: 10,
    steps: [],
    note: 'privé',
  });
  return { salle, block };
}

const pending = (operations: AiSuggestion['operations'], id = 's1'): AiSuggestion => ({
  id,
  createdAt: '2026-11-23T09:30:00.000Z',
  kind: 'create_week',
  summary: 'Proposition',
  operations,
  warnings: [],
  source: 'server',
  status: 'pending',
});

const newBlock = (categoryId: string, id = 'nb1') => ({
  id,
  categoryId,
  days: [5],
  once: null,
  startMin: 600,
  endMin: 720,
  reminderMin: 10,
  steps: [],
  note: '',
});

describe('propositions de l’IA', () => {
  it('n’écrit rien tant que la proposition n’est pas validée', async () => {
    await baseline();
    await saveSuggestion(
      db,
      pending([
        {
          op: 'add_category',
          category: { id: 'foot', name: 'foot', color: '#7EE2A8', weeklyGoalH: 2 },
        },
        { op: 'add', block: newBlock('foot') },
      ]),
    );
    expect(await listBlocks(db)).toHaveLength(1);
    expect(await listCategories(db)).toHaveLength(1);
    expect(await db.suggestions.get('s1')).toMatchObject({ status: 'pending' });
  });

  it('applique d’un bloc, annule, puis peut valider de nouveau', async () => {
    await baseline();
    await saveSuggestion(
      db,
      pending([
        {
          op: 'add_category',
          category: { id: 'foot', name: 'foot', color: '#7EE2A8', weeklyGoalH: 2 },
        },
        { op: 'add', block: newBlock('foot') },
      ]),
    );
    const undo = await applySuggestion(db, 's1');
    const cats = await listCategories(db);
    expect(cats.map((c) => [c.name, c.order])).toEqual([
      ['Salle', 0],
      ['Foot', 1],
    ]);
    expect(await db.blocks.get('nb1')).toMatchObject({ categoryId: 'foot', deleted: 0 });
    expect(await db.suggestions.get('s1')).toMatchObject({ status: 'applied' });

    await undo();
    expect(await db.blocks.get('nb1')).toBeUndefined();
    expect(await db.categories.get('foot')).toBeUndefined();
    expect(await db.suggestions.get('s1')).toMatchObject({ status: 'pending' });

    await applySuggestion(db, 's1');
    expect(await listBlocks(db)).toHaveLength(2);
  });

  it('déplace et supprime des créneaux, et l’annulation les rend intacts', async () => {
    const { block } = await baseline();
    const other = await saveBlock(db, { ...newBlock(block.categoryId), id: null });
    await saveSuggestion(
      db,
      pending([
        { op: 'update', blockId: block.id, patch: { days: [4], startMin: 1140, endMin: 1200 } },
        { op: 'delete', blockId: other.id },
      ]),
    );
    const undo = await applySuggestion(db, 's1');
    expect(await db.blocks.get(block.id)).toMatchObject({
      days: [4],
      startMin: 1140,
      note: 'privé',
    });
    expect(await db.blocks.get(other.id)).toMatchObject({ deleted: 1 });
    await undo();
    expect(await db.blocks.get(block.id)).toEqual(block);
    expect(await db.blocks.get(other.id)).toMatchObject({ deleted: 0 });
  });

  it('tout ou rien : un créneau disparu annule toute la proposition', async () => {
    const { salle } = await baseline();
    await saveSuggestion(
      db,
      pending([
        { op: 'add', block: newBlock(salle.id) },
        { op: 'delete', blockId: 'disparu' },
      ]),
    );
    await expect(applySuggestion(db, 's1')).rejects.toThrow(SuggestionError);
    expect(await db.blocks.get('nb1')).toBeUndefined();
    expect(await db.suggestions.get('s1')).toMatchObject({ status: 'pending' });
  });

  it('refuse une activité inconnue, une proposition inconnue ou déjà traitée', async () => {
    await baseline();
    await saveSuggestion(db, pending([{ op: 'add', block: newBlock('fantome') }]));
    await expect(applySuggestion(db, 's1')).rejects.toThrow('unknown-category');
    await expect(applySuggestion(db, 'nope')).rejects.toThrow('unknown');
    await dismissSuggestion(db, 's1');
    await expect(applySuggestion(db, 's1')).rejects.toThrow('not-pending');
  });

  it('refuse d’enregistrer une proposition invalide', async () => {
    await expect(saveSuggestion(db, pending([]))).rejects.toThrow();
  });
});

describe('sauvegarde v2', () => {
  it('exporte et restaure les nouvelles tables', async () => {
    await setEnergy(db, '2026-11-23', 'b1', 3);
    await saveGoal(db, { id: 'D2026-11-23', scope: 'D', kind: 'free', target: 0, text: 'Calme' });
    await saveReview(db, { id: 'W2026-47', mood: 5, a: '', b: '', summary: '', ai: true });
    await saveSuggestion(db, pending([{ op: 'delete', blockId: 'x' }]));
    const text = JSON.stringify(await exportBackup(db));
    const other = new KairoDB(`phase2-restore-${n}`);
    await restoreBackup(other, parseBackup(text));
    expect(await other.energy.count()).toBe(1);
    expect(await other.goals.count()).toBe(1);
    expect(await other.reviews.count()).toBe(1);
    expect(await other.suggestions.count()).toBe(1);
    await other.delete();
  });

  it('lit encore une sauvegarde v1', async () => {
    const backup = await exportBackup(db);
    const settings: Record<string, unknown> = { ...backup.settings };
    delete settings.trophiesSeen;
    delete settings.focusCount;
    const v1: Record<string, unknown> = { ...backup, schemaVersion: 1, settings };
    delete v1.energy;
    delete v1.goals;
    delete v1.reviews;
    delete v1.suggestions;
    const parsed = parseBackup(JSON.stringify(v1));
    expect(parsed).toMatchObject({
      energy: [],
      goals: [],
      settings: { trophiesSeen: [], focusCount: 0 },
    });
  });
});
