import { useEffect, useRef, useState } from 'react';
import type { SetType, Workout, WorkoutExercise } from '../types';
import { fmtDuration, fmtWeight, fromDisplay, toDisplay, workoutVolume } from '../lib/stats';
import { blankSet, finishWorkout, linkSuperset, makeWorkoutExercise, saveAsTemplate, saveWorkout, supersetSlots, unlinkSuperset } from '../lib/workoutOps';
import { db } from '../db';
import { Menu, Sheet, useSettings } from '../ui';
import { ExercisePicker } from './ExercisePicker';
import { ExerciseProgress } from './Progress';

const TAGS: { t: SetType; label: string; color: string }[] = [
  { t: 'N', label: 'Normal', color: 'var(--fg)' },
  { t: 'W', label: 'Warm-up', color: 'var(--warn)' },
  { t: 'D', label: 'Drop set', color: 'var(--drop)' },
  { t: 'F', label: 'Failure', color: 'var(--fail)' },
];

function RestRing({ endsAt, total, onSkip, onAdjust }: { endsAt: number; total: number; onSkip: () => void; onAdjust: (d: number) => void }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(i); }, []);
  const left = Math.max(0, Math.ceil((endsAt - now) / 1000));
  useEffect(() => { if (left === 0) { navigator.vibrate?.([200, 100, 200]); onSkip(); } }, [left]); // eslint-disable-line
  const r = 28, c = 2 * Math.PI * r;
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="timer" aria-label="Rest timer" onClick={() => setOpen(true)}>
        <svg viewBox="0 0 64 64"><circle cx="32" cy="32" r={r} fill="none" stroke="var(--card-2)" strokeWidth="4" />
          <circle cx="32" cy="32" r={r} fill="none" stroke="var(--train)" strokeWidth="4" strokeLinecap="round" strokeDasharray={c}
            strokeDashoffset={c * (1 - left / total)} transform="rotate(-90 32 32)" /></svg>
        <span>{fmtDuration(left)}</span>
      </button>
      {open && (
        <Sheet onClose={() => setOpen(false)}>
          <div className="row" style={{ justifyContent: 'center', fontSize: 40, fontWeight: 700 }}>{fmtDuration(left)}</div>
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn grow" onClick={() => onAdjust(-15)}>−15s</button>
            <button className="btn grow" onClick={() => onAdjust(15)}>+15s</button>
            <button className="btn primary grow" onClick={() => { onSkip(); setOpen(false); }}>Skip</button>
          </div>
        </Sheet>
      )}
    </>
  );
}

export function WorkoutScreen({ workout, onExit }: { workout: Workout; onExit: () => void }) {
  const { unit, defaultRestSec } = useSettings();
  const [w, setW] = useState(workout);
  const [picker, setPicker] = useState(false);
  const [tagFor, setTagFor] = useState<{ ei: number; si: number } | null>(null);
  const [progress, setProgress] = useState<WorkoutExercise | null>(null);
  const [restFor, setRestFor] = useState<number | null>(null);
  const [timer, setTimer] = useState<{ endsAt: number; total: number } | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);

  // keep the screen on while logging at the gym
  useEffect(() => {
    let lock: { release: () => Promise<void> } | undefined;
    const get = () => (navigator as any).wakeLock?.request('screen').then((l: typeof lock) => { lock = l; }).catch(() => {});
    get();
    const vis = () => document.visibilityState === 'visible' && get();
    document.addEventListener('visibilitychange', vis);
    return () => { document.removeEventListener('visibilitychange', vis); lock?.release().catch(() => {}); };
  }, []);
  const wRef = useRef(w);
  const update = (next: Workout) => { wRef.current = next; setW(next); saveWorkout(next); };
  const patchEx = (ei: number, f: (e: WorkoutExercise) => WorkoutExercise) =>
    update({ ...w, exercises: w.exercises.map((e, i) => (i === ei ? f(e) : e)) });
  const slots = supersetSlots(w);

  const setField = (ei: number, si: number, k: 'weight' | 'reps', raw: string) => {
    const v = parseFloat(raw);
    patchEx(ei, (e) => ({ ...e, sets: e.sets.map((s, i) => (i === si ? { ...s, [k]: isNaN(v) ? 0 : k === 'weight' ? fromDisplay(v, unit) : v } : s)) }));
  };
  const toggle = (ei: number, si: number) => {
    const e = w.exercises[ei];
    const done = !e.sets[si].done;
    patchEx(ei, (x) => ({ ...x, sets: x.sets.map((s, i) => (i === si ? { ...s, done } : s)) }));
    if (done) setTimer({ endsAt: Date.now() + e.restSec * 1000, total: e.restSec });
    else setTimer(null);
  };
  const addExercise = async (ex: Parameters<typeof makeWorkoutExercise>[0]) => {
    setPicker(false);
    const we = await makeWorkoutExercise(ex, defaultRestSec);
    update({ ...wRef.current, exercises: [...wRef.current.exercises, we] });
  };
  const finish = async () => {
    const done = w.exercises.flatMap((e) => e.sets).filter((s) => s.done).length;
    if (!done) { if (confirm('No sets completed. Discard this workout?')) { await db.workouts.delete(w.id!); onExit(); } return; }
    await saveWorkout(finishWorkout(w));
    onExit();
  };
  const discard = async () => { if (confirm('Discard this workout?')) { await db.workouts.delete(w.id!); onExit(); } };

  const elapsed = Math.floor((now - w.startedAt) / 1000);
  const doneSets = w.exercises.flatMap((e) => e.sets).filter((s) => s.done).length;

  return (
    <div className="screen">
      <div className="row">
        <input className="input grow" style={{ margin: 0, fontWeight: 700 }} aria-label="Workout name" value={w.name} onChange={(e) => update({ ...w, name: e.target.value })} />
        <button className="btn primary" onClick={finish}>Finish</button>
      </div>
      <div className="muted small" style={{ margin: '8px 2px 14px' }}>
        {fmtDuration(elapsed)} · {doneSets} sets · {fmtWeight(workoutVolume(w), unit)} {unit} volume
      </div>

      {w.exercises.map((e, ei) => {
        const slot = e.supersetId ? slots.get(e.supersetId) : 0;
        let n = 0;
        return (
          <div key={e.id} className={`card ex ${slot ? 'ss' + slot : ''}`}>
            <div className="row">
              <button className="exname grow" style={{ textAlign: 'left' }} onClick={() => setProgress(e)}>{e.name}</button>
              <Menu items={[
                { label: 'See progress', onClick: () => setProgress(e) },
                ...(ei < w.exercises.length - 1 ? [{ label: 'Create superset with next', onClick: () => update(linkSuperset(w, ei)) }] : []),
                ...(e.supersetId ? [{ label: 'Remove from superset', onClick: () => update(unlinkSuperset(w, ei)) }] : []),
                { label: `Rest timer: ${e.restSec}s`, onClick: () => setRestFor(ei) },
                { label: 'Move up', onClick: () => ei > 0 && update({ ...w, exercises: swap(w.exercises, ei, ei - 1) }) },
                { label: 'Move down', onClick: () => ei < w.exercises.length - 1 && update({ ...w, exercises: swap(w.exercises, ei, ei + 1) }) },
                { label: 'Remove exercise', danger: true, onClick: () => update(unlinkAndRemove(w, ei)) },
              ]} />
            </div>
            <div className="setgrid">
              <span className="hd">Set</span><span className="hd">{unit}</span><span className="hd">Reps</span><span />
              {e.sets.map((s, si) => {
                if (s.type === 'N') n++;
                return (
                  <SetRow key={s.id} label={s.type === 'N' ? String(n) : s.type} type={s.type} done={s.done}
                    weight={s.weight ? String(Math.round(toDisplay(s.weight, unit) * 10) / 10) : ''} reps={s.reps ? String(s.reps) : ''}
                    onTag={() => setTagFor({ ei, si })} onW={(v) => setField(ei, si, 'weight', v)} onR={(v) => setField(ei, si, 'reps', v)} onToggle={() => toggle(ei, si)} />
                );
              })}
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn sm grow" onClick={() => patchEx(ei, (x) => ({ ...x, sets: [...x.sets, blankSet({ weight: x.sets.at(-1)?.weight ?? 0, reps: x.sets.at(-1)?.reps ?? 0 })] }))}>+ Add set</button>
              {e.sets.length > 1 && <button className="btn sm" aria-label="Remove last set" onClick={() => patchEx(ei, (x) => ({ ...x, sets: x.sets.slice(0, -1) }))}>−</button>}
            </div>
          </div>
        );
      })}

      <button className="btn block" onClick={() => setPicker(true)}>+ Add exercise</button>
      <div className="row" style={{ marginTop: 14 }}>
        {w.exercises.length > 0 && <button className="btn sm grow" onClick={async () => { await saveAsTemplate(w); alert('Saved as template'); }}>Save as template</button>}
        <button className="btn sm grow danger" onClick={discard}>Discard workout</button>
      </div>

      {picker && <ExercisePicker onPick={addExercise} onClose={() => setPicker(false)} />}
      {tagFor && (
        <Sheet onClose={() => setTagFor(null)}>
          <h2 style={{ marginTop: 0 }}>Set type</h2>
          {TAGS.map((t) => (
            <button key={t.t} className="btn block" style={{ marginBottom: 8, color: t.color }}
              onClick={() => { patchEx(tagFor.ei, (e) => ({ ...e, sets: e.sets.map((s, i) => (i === tagFor.si ? { ...s, type: t.t } : s)) })); setTagFor(null); }}>
              {t.t !== 'N' && <b>{t.t} </b>}{t.label}
            </button>
          ))}
          <button className="btn block danger" onClick={() => { patchEx(tagFor.ei, (e) => ({ ...e, sets: e.sets.filter((_, i) => i !== tagFor.si) })); setTagFor(null); }}>Delete set</button>
        </Sheet>
      )}
      {restFor !== null && (
        <Sheet onClose={() => setRestFor(null)}>
          <h2 style={{ marginTop: 0 }}>Rest between sets</h2>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            {[0, 30, 45, 60, 90, 120, 180, 240].map((s) => (
              <button key={s} className={'chip' + (w.exercises[restFor].restSec === s ? ' on' : '')} onClick={() => { patchEx(restFor, (e) => ({ ...e, restSec: s })); setRestFor(null); }}>{s ? fmtDuration(s) : 'Off'}</button>
            ))}
          </div>
        </Sheet>
      )}
      {progress && <ExerciseProgress exerciseId={progress.exerciseId} name={progress.name} onClose={() => setProgress(null)} />}
      {timer && timer.total > 0 && <RestRing endsAt={timer.endsAt} total={timer.total} onSkip={() => setTimer(null)} onAdjust={(d) => setTimer({ endsAt: timer.endsAt + d * 1000, total: Math.max(timer.total + d, 5) })} />}
    </div>
  );
}

function SetRow(p: { label: string; type: SetType; done: boolean; weight: string; reps: string; onTag: () => void; onW: (v: string) => void; onR: (v: string) => void; onToggle: () => void }) {
  return (
    <>
      <button className={`setno ${p.type}`} aria-label="Set type" onClick={p.onTag}>{p.label}</button>
      <input className="num" inputMode="decimal" placeholder="0" aria-label="Weight" value={p.weight} onChange={(e) => p.onW(e.target.value)} />
      <input className="num" inputMode="numeric" placeholder="0" aria-label="Reps" value={p.reps} onChange={(e) => p.onR(e.target.value)} />
      <button className={'chk' + (p.done ? ' on' : '')} aria-label="Complete set" onClick={p.onToggle}>✓</button>
    </>
  );
}

function swap<T>(a: T[], i: number, j: number) { const b = [...a]; [b[i], b[j]] = [b[j], b[i]]; return b; }
function unlinkAndRemove(w: Workout, i: number): Workout {
  const u = w.exercises[i].supersetId ? unlinkSuperset(w, i) : w;
  return { ...u, exercises: u.exercises.filter((_, k) => k !== i) };
}
