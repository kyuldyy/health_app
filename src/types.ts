export type SetType = 'N' | 'W' | 'D' | 'F';
export type Unit = 'kg' | 'lb';

export interface Exercise {
  id?: number;
  name: string;
  muscle: string;
  custom?: boolean;
}
export interface SetEntry {
  id: string;
  weight: number; // always stored in kg
  reps: number;
  type: SetType;
  done: boolean;
}
export interface WorkoutExercise {
  id: string;
  exerciseId: number;
  name: string;
  supersetId?: string;
  restSec: number;
  note?: string;
  sets: SetEntry[];
}
export interface Workout {
  id?: number;
  name: string;
  startedAt: number;
  finishedAt?: number;
  exercises: WorkoutExercise[];
}
export interface Template {
  id?: number;
  name: string;
  exercises: { exerciseId: number; name: string; sets: number; supersetId?: string; restSec: number }[];
}
export interface Settings {
  key: 'main';
  unit: Unit;
  defaultRestSec: number;
}
