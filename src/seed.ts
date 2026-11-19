import type { Exercise } from './types';

const L: [string, string][] = [
  ['Bench Press', 'Chest'], ['Incline Dumbbell Press', 'Chest'], ['Chest Fly', 'Chest'], ['Push-Up', 'Chest'], ['Dip', 'Chest'],
  ['Deadlift', 'Back'], ['Barbell Row', 'Back'], ['Pull-Up', 'Back'], ['Lat Pulldown', 'Back'], ['Seated Cable Row', 'Back'], ['Dumbbell Row', 'Back'],
  ['Overhead Press', 'Shoulders'], ['Lateral Raise', 'Shoulders'], ['Rear Delt Fly', 'Shoulders'], ['Face Pull', 'Shoulders'], ['Arnold Press', 'Shoulders'],
  ['Squat', 'Legs'], ['Front Squat', 'Legs'], ['Leg Press', 'Legs'], ['Romanian Deadlift', 'Legs'], ['Lunge', 'Legs'], ['Bulgarian Split Squat', 'Legs'],
  ['Leg Extension', 'Legs'], ['Leg Curl', 'Legs'], ['Hip Thrust', 'Legs'], ['Calf Raise', 'Legs'],
  ['Barbell Curl', 'Arms'], ['Dumbbell Curl', 'Arms'], ['Hammer Curl', 'Arms'], ['Tricep Pushdown', 'Arms'], ['Skull Crusher', 'Arms'], ['Overhead Tricep Extension', 'Arms'],
  ['Plank', 'Core'], ['Hanging Leg Raise', 'Core'], ['Cable Crunch', 'Core'], ['Ab Wheel', 'Core'],
];
export const SEED_EXERCISES: Exercise[] = L.map(([name, muscle]) => ({ name, muscle }));
