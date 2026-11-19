import { db } from '../db';
import type { Exercise, SetEntry, Template, Workout, WorkoutExercise } from '../types';
import { uid } from '../ui';
import { workingSets } from './stats';

export const blankSet = (p?: Partial<SetEntry>): SetEntry => ({ id: uid(), weight: 0, reps: 0, type: 'N', done: false, ...p });

export async function lastSets(exerciseId: number): Promise<SetEntry[]> {
  const all = await db.workouts.orderBy('startedAt').reverse().filter((w) => !!w.finishedAt).toArray();
  for (const w of all) {
    const e = w.exercises.find((x) => x.exerciseId === exerciseId);
    const s = e && workingSets(e.sets);
    if (s?.length) return s;
  }
  return [];
}

export async function makeWorkoutExercise(ex: Exercise, restSec: number, setCount = 0): Promise<WorkoutExercise> {
  const prev = await lastSets(ex.id!);
  const n = Math.max(setCount, prev.length, 1);
  const sets = Array.from({ length: n }, (_, i) => blankSet({ weight: prev[i]?.weight ?? prev.at(-1)?.weight ?? 0, reps: prev[i]?.reps ?? prev.at(-1)?.reps ?? 0 }));
  return { id: uid(), exerciseId: ex.id!, name: ex.name, restSec, sets };
}

export async function startWorkout(name = 'Workout', template?: Template, restSec = 90): Promise<number> {
  const exercises: WorkoutExercise[] = [];
  const ssMap = new Map<string, string>();
  for (const t of template?.exercises ?? []) {
    const ex = await db.exercises.get(t.exerciseId);
    if (!ex) continue;
    const we = await makeWorkoutExercise(ex, t.restSec ?? restSec, t.sets);
    if (t.supersetId) { if (!ssMap.has(t.supersetId)) ssMap.set(t.supersetId, uid()); we.supersetId = ssMap.get(t.supersetId); }
    exercises.push(we);
  }
  return db.workouts.add({ name: template?.name ?? name, startedAt: Date.now(), exercises });
}

export const saveWorkout = (w: Workout) => db.workouts.put(w);

/** Link exercise at index i with the next one into a superset. */
export function linkSuperset(w: Workout, i: number): Workout {
  const ex = [...w.exercises];
  const a = ex[i], b = ex[i + 1];
  if (!a || !b) return w;
  const id = a.supersetId ?? b.supersetId ?? uid();
  ex[i] = { ...a, supersetId: id };
  ex[i + 1] = { ...b, supersetId: id };
  return { ...w, exercises: ex };
}

export function unlinkSuperset(w: Workout, i: number): Workout {
  const ex = w.exercises.map((e) => ({ ...e }));
  const id = ex[i].supersetId;
  delete ex[i].supersetId;
  // a group of one is not a superset
  const rest = ex.filter((e) => e.supersetId === id);
  if (rest.length === 1) delete rest[0].supersetId;
  return { ...w, exercises: ex };
}

/** Superset ids -> color slot 1..4 in order of appearance. */
export function supersetSlots(w: Workout): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of w.exercises) if (e.supersetId && !m.has(e.supersetId)) m.set(e.supersetId, (m.size % 4) + 1);
  return m;
}

export async function saveAsTemplate(w: Workout) {
  await db.templates.add({
    name: w.name,
    exercises: w.exercises.map((e) => ({ exerciseId: e.exerciseId, name: e.name, sets: e.sets.length, supersetId: e.supersetId, restSec: e.restSec })),
  });
}

/** Drop incomplete sets and empty exercises, then mark finished. */
export function finishWorkout(w: Workout): Workout {
  const exercises = w.exercises
    .map((e) => ({ ...e, sets: e.sets.filter((s) => s.done) }))
    .filter((e) => e.sets.length > 0);
  return { ...w, exercises, finishedAt: Date.now() };
}
