import Dexie, { type Table } from 'dexie';
import type { Exercise, Settings, Template, Workout } from './types';
import { SEED_EXERCISES } from './seed';

class EmberDB extends Dexie {
  exercises!: Table<Exercise, number>;
  workouts!: Table<Workout, number>;
  templates!: Table<Template, number>;
  settings!: Table<Settings, string>;
  constructor(name = 'ember') {
    super(name);
    this.version(1).stores({
      exercises: '++id, name, muscle',
      workouts: '++id, startedAt, finishedAt',
      templates: '++id, name',
      settings: 'key',
    });
  }
}
export const db = new EmberDB();

export const DEFAULT_SETTINGS: Settings = { key: 'main', unit: 'kg', defaultRestSec: 90 };

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
    settings: await db.settings.toArray(),
  });
}

export async function importAll(json: string) {
  const d = JSON.parse(json);
  if (!d || !Array.isArray(d.workouts) || !Array.isArray(d.exercises)) throw new Error('Not an Ember backup file');
  await db.transaction('rw', db.exercises, db.workouts, db.templates, db.settings, async () => {
    await Promise.all([db.exercises.clear(), db.workouts.clear(), db.templates.clear(), db.settings.clear()]);
    await db.exercises.bulkPut(d.exercises);
    await db.workouts.bulkPut(d.workouts);
    await db.templates.bulkPut(d.templates ?? []);
    await db.settings.bulkPut(d.settings?.length ? d.settings : [DEFAULT_SETTINGS]);
  });
}
