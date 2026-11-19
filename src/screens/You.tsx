import { useLiveQuery } from 'dexie-react-hooks';
import { useRef, useState } from 'react';
import { db, exportAll, importAll } from '../db';
import { exerciseHistory, fmtWeight, personalRecords } from '../lib/stats';
import { useSettings } from '../ui';
import { ExerciseProgress } from './Progress';

export function You() {
  const s = useSettings();
  const workouts = useLiveQuery(() => db.workouts.toArray(), []) ?? [];
  const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray(), []) ?? [];
  const [sel, setSel] = useState<{ id: number; name: string } | null>(null);
  const [showAll, setShowAll] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const trained = exercises.filter((e) => exerciseHistory(workouts, e.id!).length);

  const backup = async () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([await exportAll()], { type: 'application/json' }));
    a.download = `ember-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };
  const restore = async (f?: File) => {
    if (!f || !confirm('Restoring replaces all current data. Continue?')) return;
    try { await importAll(await f.text()); alert('Restored'); } catch (e) { alert((e as Error).message); }
  };

  return (
    <>
      <h1>You</h1>
      <h2>Settings</h2>
      <div className="card row"><span className="grow">Weight unit</span>
        {(['kg', 'lb'] as const).map((u) => <button key={u} className={'chip' + (s.unit === u ? ' on' : '')} style={{ margin: 0 }} onClick={() => db.settings.put({ ...s, unit: u })}>{u}</button>)}
      </div>
      <div className="card row"><span className="grow">Default rest (sec)</span>
        <input className="num" style={{ width: 80 }} inputMode="numeric" value={s.defaultRestSec} onChange={(e) => db.settings.put({ ...s, defaultRestSec: Math.max(0, parseInt(e.target.value) || 0) })} /></div>
      <h2>Exercise progress</h2>
      {!trained.length && <div className="muted small">Finish a workout to see progress here.</div>}
      {(showAll ? trained : trained.slice(0, 5)).map((e) => {
        const pr = personalRecords(exerciseHistory(workouts, e.id!));
        return <button key={e.id} className="card row" style={{ width: '100%', textAlign: 'left' }} onClick={() => setSel({ id: e.id!, name: e.name })}>
          <span className="grow">{e.name}</span><span className="muted small">Best {fmtWeight(pr.heaviest, s.unit)} {s.unit}</span></button>;
      })}
      {trained.length > 5 && <button className="btn sm" onClick={() => setShowAll(!showAll)}>{showAll ? 'Show less' : `Show all ${trained.length}`}</button>}
      <h2>Your data</h2>
      <p className="muted small">Everything is stored on this device. Back it up regularly.</p>
      <div className="row"><button className="btn grow" onClick={backup}>Export backup</button><button className="btn grow" onClick={() => file.current?.click()}>Restore</button></div>
      <input ref={file} type="file" accept="application/json" hidden onChange={(e) => restore(e.target.files?.[0])} />
      {sel && <ExerciseProgress exerciseId={sel.id} name={sel.name} onClose={() => setSel(null)} />}
    </>
  );
}
