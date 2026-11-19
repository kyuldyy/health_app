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
export interface Targets { kcal: number; protein: number; carbs: number; fat: number }
export interface Settings {
  key: 'main';
  unit: Unit;
  defaultRestSec: number;
  targets?: Targets;
  claudeKey?: string;
}

export interface Per100 { kcal: number; protein: number; carbs: number; fat: number }
export interface Food extends Per100 {
  id?: number;
  name: string;
  brand?: string;
  barcode?: string;
  servingG?: number; // typical serving in grams
  source: 'custom' | 'off' | 'usda';
}
export interface PantryItem { id?: number; foodId: number; grams: number; expires?: string }
export type MealSlot = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
export interface LogEntry { id?: number; date: string; slot: MealSlot; foodId: number; name: string; grams: number; kcal: number; protein: number; carbs: number; fat: number }
export interface Recipe { id?: number; name: string; ingredients: { foodId: number; name: string; grams: number }[]; notes?: string }
