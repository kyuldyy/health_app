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
  const st = (await db.settings.get('main'))!;
  if (!st.seededTemplates) {
    if ((await db.templates.count()) === 0) {
      const id = async (n: string) => (await db.exercises.where('name').equals(n).first())?.id;
      const mk = async (name: string, rest: number, items: [string, number][]) => {
        const exercises = [];
        for (const [n, sets] of items) { const eid = await id(n); if (eid) exercises.push({ exerciseId: eid, name: n, sets, restSec: rest }); }
        await db.templates.add({ name, exercises });
      };
      await mk('Push A', 120, [['Bench Press', 4], ['Incline Dumbbell Press', 3], ['Overhead Press', 3], ['Lateral Raise', 3], ['Tricep Pushdown', 3]]);
      await mk('Pull A', 120, [['Barbell Row', 4], ['Pull-Up', 3], ['Seated Cable Row', 3], ['Face Pull', 3], ['Barbell Curl', 3]]);
      await mk('Legs', 150, [['Squat', 4], ['Romanian Deadlift', 3], ['Leg Press', 3], ['Leg Curl', 3], ['Calf Raise', 4]]);
    }
    await db.settings.put({ ...st, seededTemplates: true });
  }
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
