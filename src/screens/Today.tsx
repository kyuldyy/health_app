import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { fmtWeight, workoutVolume } from '../lib/stats';
import { startWorkout } from '../lib/workoutOps';
import { sumLog, todayStr } from '../lib/macros';
import { useSettings } from '../ui';
import { MacroBars } from './Food';

export function Today() {
  const { unit, defaultRestSec, targets } = useSettings();
  const food = useLiveQuery(() => db.log.where('date').equals(todayStr()).toArray(), []) ?? [];
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const today = useLiveQuery(() => db.workouts.where('startedAt').aboveOrEqual(start.getTime()).filter((w) => !!w.finishedAt).toArray(), []) ?? [];
  const templates = useLiveQuery(() => db.templates.toArray(), []) ?? [];
  const week = useLiveQuery(() => db.workouts.where('startedAt').aboveOrEqual(Date.now() - 7 * 864e5).filter((w) => !!w.finishedAt).count(), []) ?? 0;
  return (
    <>
      <h1>{new Date().toLocaleDateString(undefined, { weekday: 'long' })}</h1>
      <div className="row"><div className="stat"><span className="muted small">This week</span><b>{week} workouts</b></div></div>
      <h2>Training</h2>
      {today.length ? today.map((w) => <div className="card" key={w.id}><b>{w.name}</b><div className="muted small">{w.exercises.length} exercises · {fmtWeight(workoutVolume(w), unit)} {unit}</div></div>)
        : <div className="card"><div className="muted" style={{ marginBottom: 10 }}>Nothing logged yet today.</div>
          <button className="btn primary block" onClick={() => startWorkout('Workout', undefined, defaultRestSec)}>Start workout</button></div>}
      {templates.slice(0, 3).map((t) => <button key={t.id} className="card row" style={{ width: '100%', textAlign: 'left' }} onClick={() => startWorkout(t.name, t, defaultRestSec)}><span className="grow">{t.name}</span><span className="muted small">Start</span></button>)}
      <h2>Food</h2>
      <MacroBars eaten={sumLog(food)} targets={targets as any} />
    </>
  );
}
