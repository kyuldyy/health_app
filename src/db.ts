import Dexie, { type Table } from 'dexie';
import type { Exercise, Food, LogEntry, PantryItem, Recipe, Settings, Template, Workout } from './types';
import { SEED_EXERCISES } from './seed';

class EmberDB extends Dexie {
  exercises!: Table<Exercise, number>;
  workouts!: Table<Workout, number>;
  templates!: Table<Template, number>;
  settings!: Table<Settings, string>;
  foods!: Table<Food, number>;
  pantry!: Table<PantryItem, number>;
  log!: Table<LogEntry, number>;
  recipes!: Table<Recipe, number>;
  constructor(name = 'ember') {
    super(name);
    this.version(1).stores({
      exercises: '++id, name, muscle',
      workouts: '++id, startedAt, finishedAt',
      templates: '++id, name',
      settings: 'key',
    });
    this.version(2).stores({
      foods: '++id, name, barcode',
      pantry: '++id, foodId',
      log: '++id, date',
      recipes: '++id, name',
    });
  }
}
export const db = new EmberDB();

export const DEFAULT_SETTINGS: Settings = { key: 'main', unit: 'kg', defaultRestSec: 90, targets: { kcal: 2400, protein: 160, carbs: 260, fat: 70 } };

export async function initDb() {
  if ((await db.exercises.count()) === 0) await db.exercises.bulkAdd(SEED_EXERCISES);
  if (!(await db.settings.get('main'))) await db.settings.put(DEFAULT_SETTINGS);
}

export async function exportAll() {
  return JSON.stringify({
    version: 1,
    exportedAt: new Date().toISOString(),
    exercises: await db.exercises.toArray(),
    workouts: await db.workouts.toArray(),
    templates: await db.templates.toArray(),
    foods: await db.foods.toArray(),
    pantry: await db.pantry.toArray(),
    log: await db.log.toArray(),
    recipes: await db.recipes.toArray(),
    settings: await db.settings.toArray(),
  });
}

export async function importAll(json: string) {
  const d = JSON.parse(json);
  if (!d || !Array.isArray(d.workouts) || !Array.isArray(d.exercises)) throw new Error('Not an Ember backup file');
  await db.transaction('rw', [db.exercises, db.workouts, db.templates, db.settings, db.foods, db.pantry, db.log, db.recipes], async () => {
    await Promise.all([db.exercises.clear(), db.workouts.clear(), db.templates.clear(), db.settings.clear(), db.foods.clear(), db.pantry.clear(), db.log.clear(), db.recipes.clear()]);
    await db.foods.bulkPut(d.foods ?? []);
    await db.pantry.bulkPut(d.pantry ?? []);
    await db.log.bulkPut(d.log ?? []);
    await db.recipes.bulkPut(d.recipes ?? []);
    await db.exercises.bulkPut(d.exercises);
    await db.workouts.bulkPut(d.workouts);
    await db.templates.bulkPut(d.templates ?? []);
    await db.settings.bulkPut(d.settings?.length ? d.settings : [DEFAULT_SETTINGS]);
  });
}
