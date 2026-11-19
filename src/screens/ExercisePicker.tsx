import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Exercise } from '../types';
import { Sheet } from '../ui';

const MUSCLES = ['Chest', 'Back', 'Shoulders', 'Legs', 'Arms', 'Core', 'Other'];

export function ExercisePicker({ onPick, onClose }: { onPick: (e: Exercise) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState('');
  const all = useLiveQuery(() => db.exercises.orderBy('name').toArray(), []) ?? [];
  const list = all.filter((e) => e.name.toLowerCase().includes(q.toLowerCase()) && (!muscle || e.muscle === muscle));
  const canCreate = q.trim() && !all.some((e) => e.name.toLowerCase() === q.trim().toLowerCase());
  const create = async () => {
    const name = q.trim();
    const id = await db.exercises.add({ name, muscle: muscle || 'Other', custom: true });
    onPick({ id, name, muscle: muscle || 'Other', custom: true });
  };
  return (
    <Sheet onClose={onClose}>
      <input className="input" autoFocus placeholder="Search or add exercise" value={q} onChange={(e) => setQ(e.target.value)} />
      <div>{MUSCLES.map((m) => <button key={m} className={'chip' + (muscle === m ? ' on' : '')} onClick={() => setMuscle(muscle === m ? '' : m)}>{m}</button>)}</div>
      {canCreate && <button className="btn primary block" onClick={create} style={{ margin: '8px 0' }}>Create “{q.trim()}”{muscle ? ` (${muscle})` : ''}</button>}
      <div className="list">
        {list.map((e) => (
          <button key={e.id} className="item" onClick={() => onPick(e)}>
            <span className="grow">{e.name}</span><span className="muted small">{e.muscle}</span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}
