import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db } from '../db';
import { fmtWeight, workoutVolume } from '../lib/stats';
import { startWorkout } from '../lib/workoutOps';
import { useSettings } from '../ui';

export function Train() {
  const { unit, defaultRestSec } = useSettings();
  const templates = useLiveQuery(() => db.templates.toArray(), []) ?? [];
  const history = useLiveQuery(() => db.workouts.orderBy('startedAt').reverse().filter((w) => !!w.finishedAt).limit(50).toArray(), []) ?? [];
  const [open, setOpen] = useState<number | null>(null);
  return (
    <>
      <h1>Train</h1>
      <button className="btn primary block" onClick={() => startWorkout('Workout', undefined, defaultRestSec)}>Start empty workout</button>
      <h2>Templates</h2>
      {!templates.length && <div className="muted small">Finish setting up a workout, then tap “Save as template”.</div>}
      {templates.map((t) => (
        <div className="card row" key={t.id}>
          <button className="grow" style={{ textAlign: 'left' }} onClick={() => startWorkout(t.name, t, defaultRestSec)}>
            <b>{t.name}</b><div className="muted small">{t.exercises.map((e) => e.name).join(', ')}</div>
          </button>
          <button className="btn sm danger" onClick={() => confirm('Delete template?') && db.templates.delete(t.id!)}>Delete</button>
        </div>
      ))}
      <h2>History</h2>
      {!history.length && <div className="empty">No workouts yet.</div>}
      {history.map((w) => (
        <div className="card" key={w.id}>
          <button className="row" style={{ width: '100%', textAlign: 'left' }} onClick={() => setOpen(open === w.id ? null : w.id!)}>
            <div className="grow"><b>{w.name}</b><div className="muted small">{new Date(w.startedAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · {Math.round(((w.finishedAt ?? w.startedAt) - w.startedAt) / 60000)} min · {fmtWeight(workoutVolume(w), unit)} {unit}</div></div>
          </button>
          {open === w.id && (
            <div style={{ marginTop: 8 }}>
              {w.exercises.map((e) => (
                <div key={e.id} className="small" style={{ marginTop: 6 }}>
                  <b>{e.name}</b> <span className="muted">{e.sets.map((s) => `${s.type !== 'N' ? s.type + ' ' : ''}${fmtWeight(s.weight, unit)}×${s.reps}`).join(' · ')}</span>
                </div>
              ))}
              <button className="btn sm danger" style={{ marginTop: 10 }} onClick={() => confirm('Delete this workout?') && db.workouts.delete(w.id!)}>Delete workout</button>
            </div>
          )}
        </div>
      ))}
    </>
  );
}
