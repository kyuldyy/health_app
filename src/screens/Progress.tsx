import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { e1rm, exerciseHistory, fmtWeight, personalRecords, toDisplay } from '../lib/stats';
import { LineChart, useSettings } from '../ui';

/** Full-screen per-exercise progress, closed with the X. */
export function ExerciseProgress({ exerciseId, name, onClose }: { exerciseId: number; name: string; onClose: () => void }) {
  const { unit } = useSettings();
  const workouts = useLiveQuery(() => db.workouts.toArray(), []) ?? [];
  const hist = exerciseHistory(workouts, exerciseId);
  const pr = personalRecords(hist);
  return (
    <div className="full">
      <div className="row"><h1 className="grow" style={{ margin: 0 }}>{name}</h1><button className="x" aria-label="Close" onClick={onClose}>✕</button></div>
      <h2>Estimated 1RM</h2>
      <div className="card"><LineChart unit={unit} points={hist.map((h) => ({ x: h.date, y: toDisplay(h.bestE1rm, unit) }))} /></div>
      <div className="row">
        <div className="stat"><span className="muted small">Heaviest</span><b>{fmtWeight(pr.heaviest, unit)} {unit}</b></div>
        <div className="stat"><span className="muted small">Best est. 1RM</span><b>{fmtWeight(pr.bestE1rm, unit)} {unit}</b></div>
        <div className="stat"><span className="muted small">Best volume</span><b>{fmtWeight(pr.bestVolume, unit)}</b></div>
      </div>
      <h2>History</h2>
      {!hist.length && <div className="empty">No finished sessions yet.</div>}
      {[...hist].reverse().map((h) => (
        <div className="card" key={h.workoutId}>
          <div className="muted small">{new Date(h.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</div>
          {h.sets.map((s, i) => (
            <div key={i} className="row small" style={{ marginTop: 4 }}>
              <span className="muted" style={{ width: 20 }}>{i + 1}</span>
              <span>{fmtWeight(s.weight, unit)} {unit} × {s.reps}</span>
              {s.type !== 'N' && <span className="muted">({s.type})</span>}
              {s.weight === pr.heaviest && <span style={{ color: 'var(--train)' }}>PR</span>}
              <span className="muted grow" style={{ textAlign: 'right' }}>{fmtWeight(e1rm(s.weight, s.reps), unit)} e1RM</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
