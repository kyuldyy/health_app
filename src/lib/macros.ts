import type { LogEntry, Per100 } from '../types';

export interface Macros { kcal: number; protein: number; carbs: number; fat: number }
export const ZERO: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

export const macrosFor = (f: Per100, grams: number): Macros => ({
  kcal: (f.kcal * grams) / 100, protein: (f.protein * grams) / 100, carbs: (f.carbs * grams) / 100, fat: (f.fat * grams) / 100,
});
export const addMacros = (a: Macros, b: Macros): Macros => ({ kcal: a.kcal + b.kcal, protein: a.protein + b.protein, carbs: a.carbs + b.carbs, fat: a.fat + b.fat });
export const sumLog = (es: LogEntry[]): Macros => es.reduce((a, e) => addMacros(a, e), ZERO);
export const r0 = (n: number) => Math.round(n);
export const todayStr = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const remaining = (t: Macros, eaten: Macros): Macros => ({ kcal: t.kcal - eaten.kcal, protein: t.protein - eaten.protein, carbs: t.carbs - eaten.carbs, fat: t.fat - eaten.fat });
