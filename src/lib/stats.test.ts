import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { e1rm, exerciseHistory, fmtWeight, personalRecords, workoutVolume } from './stats';
import type { Workout } from '../types';

const w: Workout = {
  id: 1, name: 'A', startedAt: 1, finishedAt: 2,
  exercises: [{ id: 'x', exerciseId: 7, name: 'Bench', restSec: 90, sets: [
    { id: '1', weight: 40, reps: 10, type: 'W', done: true },
    { id: '2', weight: 100, reps: 5, type: 'N', done: true },
    { id: '3', weight: 100, reps: 5, type: 'N', done: false },
  ] }],
};
describe('stats', () => {
  it('ignores warm-ups and incomplete sets', () => {
    expect(workoutVolume(w)).toBe(500);
    const h = exerciseHistory([w], 7);
    expect(h).toHaveLength(1);
    expect(personalRecords(h).heaviest).toBe(100);
  });
  it('estimates 1RM', () => {
    expect(e1rm(100, 1)).toBe(100);
    expect(Math.round(e1rm(100, 5))).toBe(117);
  });
  it('converts units', () => { expect(fmtWeight(100, 'lb')).toBe('220.5'); });
});

import { finishWorkout, linkSuperset, unlinkSuperset } from './workoutOps';
describe('workout ops', () => {
  const mk = (n: number) => ({ id: 1, name: 'x', startedAt: 1, exercises: Array.from({ length: n }, (_, i) => ({ id: 'e' + i, exerciseId: i, name: 'e' + i, restSec: 60, sets: [{ id: 's', weight: 1, reps: 1, type: 'N' as const, done: i === 0 }] })) });
  it('links and unlinks supersets', () => {
    const l = linkSuperset(mk(3), 0);
    expect(l.exercises[0].supersetId).toBe(l.exercises[1].supersetId);
    expect(l.exercises[2].supersetId).toBeUndefined();
    const u = unlinkSuperset(l, 0);
    expect(u.exercises[1].supersetId).toBeUndefined();
  });
  it('finish drops undone sets', () => {
    const f = finishWorkout(mk(2));
    expect(f.exercises).toHaveLength(1);
    expect(f.finishedAt).toBeTruthy();
  });
});
