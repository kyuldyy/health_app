import type { SetEntry, Unit, Workout } from '../types';

export const KG_PER_LB = 0.45359237;
export const toDisplay = (kg: number, u: Unit) => (u === 'kg' ? kg : kg / KG_PER_LB);
export const fromDisplay = (v: number, u: Unit) => (u === 'kg' ? v : v * KG_PER_LB);
export const fmtWeight = (kg: number, u: Unit) => String(Math.round(toDisplay(kg, u) * 10) / 10);

/** Epley estimated one-rep max. */
export const e1rm = (weight: number, reps: number) => (reps <= 1 ? weight : weight * (1 + reps / 30));

/** Sets that count toward progress: completed, non warm-up. */
export const workingSets = (sets: SetEntry[]) => sets.filter((s) => s.done && s.type !== 'W' && s.reps > 0);

export const setVolume = (s: SetEntry) => s.weight * s.reps;
export const workoutVolume = (w: Workout) =>
  w.exercises.reduce((a, e) => a + workingSets(e.sets).reduce((b, s) => b + setVolume(s), 0), 0);

export interface ExerciseSession {
  date: number;
  workoutId: number;
  sets: SetEntry[];
  topWeight: number;
  bestE1rm: number;
  volume: number;
}

export function exerciseHistory(workouts: Workout[], exerciseId: number): ExerciseSession[] {
  const out: ExerciseSession[] = [];
  for (const w of workouts) {
    if (!w.finishedAt) continue;
    const sets = w.exercises.filter((e) => e.exerciseId === exerciseId).flatMap((e) => workingSets(e.sets));
    if (!sets.length) continue;
    out.push({
      date: w.startedAt,
      workoutId: w.id!,
      sets,
      topWeight: Math.max(...sets.map((s) => s.weight)),
      bestE1rm: Math.max(...sets.map((s) => e1rm(s.weight, s.reps))),
      volume: sets.reduce((a, s) => a + setVolume(s), 0),
    });
  }
  return out.sort((a, b) => a.date - b.date);
}

export function personalRecords(history: ExerciseSession[]) {
  let heaviest = 0, bestE = 0, bestVol = 0;
  for (const h of history) {
    heaviest = Math.max(heaviest, h.topWeight);
    bestE = Math.max(bestE, h.bestE1rm);
    bestVol = Math.max(bestVol, h.volume);
  }
  return { heaviest, bestE1rm: bestE, bestVolume: bestVol };
}

export const fmtDuration = (sec: number) => {
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};
