import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Food as FoodT, LogEntry, MealSlot } from '../types';
import { macrosFor, r0, remaining, sumLog, todayStr } from '../lib/macros';
import { Sheet, useSettings } from '../ui';
import { FoodPicker } from './FoodPicker';
import { MealIdeas } from './MealIdeas';

const SLOTS: MealSlot[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

export function MacroBars({ eaten, targets }: { eaten: ReturnType<typeof sumLog>; targets: ReturnType<typeof sumLog> }) {
  const rows: [string, keyof typeof eaten, string][] = [['Protein', 'protein', 'var(--protein)'], ['Carbs', 'carbs', 'var(--carbs)'], ['Fat', 'fat', 'var(--fat)']];
  return (
    <div className="card">
      <div className="row"><b style={{ fontSize: 26 }}>{r0(eaten.kcal)}</b><span className="muted">/ {r0(targets.kcal)} kcal</span><span className="grow" /><span className="muted small">{r0(targets.kcal - eaten.kcal)} left</span></div>
      <div className="bar" style={{ margin: '6px 0 12px' }}><i style={{ width: Math.min(100, (eaten.kcal / (targets.kcal || 1)) * 100) + '%', background: 'var(--food)' }} /></div>
      {rows.map(([l, k, c]) => (
        <div key={k} style={{ marginBottom: 8 }}>
          <div className="row small"><span className="grow">{l}</span><span className="muted">{r0(eaten[k])} / {r0(targets[k])} g</span></div>
          <div className="bar"><i style={{ width: Math.min(100, (eaten[k] / (targets[k] || 1)) * 100) + '%', background: c }} /></div>
        </div>
      ))}
    </div>
  );
}

function AmountSheet({ food, initial, label, onSave, onClose }: { food: FoodT; initial?: number; label: string; onSave: (g: number) => void; onClose: () => void }) {
  const [g, setG] = useState(String(initial ?? food.servingG ?? 100));
  const grams = parseFloat(g) || 0;
  const m = macrosFor(food, grams);
  return (
    <Sheet onClose={onClose}>
      <h2 style={{ marginTop: 0 }}>{food.name}</h2>
      <div className="row"><input className="input grow" autoFocus inputMode="decimal" aria-label="Grams" value={g} onChange={(e) => setG(e.target.value)} /><span className="muted">grams</span></div>
      {food.servingG && <button className="chip" onClick={() => setG(String(food.servingG))}>1 serving ({food.servingG} g)</button>}
      <p className="muted small">{r0(m.kcal)} kcal · P {r0(m.protein)} · C {r0(m.carbs)} · F {r0(m.fat)}</p>
      <button className="btn primary block" disabled={grams <= 0} onClick={() => onSave(grams)}>{label}</button>
    </Sheet>
  );
}

export function Food() {
  const [sub, setSub] = useState<'log' | 'pantry' | 'ideas'>('log');
  return (
    <>
      <h1>Food</h1>
      <div style={{ marginBottom: 12 }}>{(['log', 'pantry', 'ideas'] as const).map((s) => <button key={s} className={'chip' + (sub === s ? ' on' : '')} onClick={() => setSub(s)}>{{ log: 'Log', pantry: 'Pantry', ideas: 'Meal ideas' }[s]}</button>)}</div>
      {sub === 'log' && <FoodLog />}
      {sub === 'pantry' && <Pantry />}
      {sub === 'ideas' && <MealIdeas />}
    </>
  );
}

export function addLogEntry(food: FoodT, grams: number, slot: MealSlot, date = todayStr(), pantryDeduct = true) {
  const m = macrosFor(food, grams);
  return db.transaction('rw', db.log, db.pantry, async () => {
    await db.log.add({ date, slot, foodId: food.id!, name: food.name, grams, ...m });
    if (pantryDeduct) {
      const p = await db.pantry.where('foodId').equals(food.id!).first();
      if (p) { const left = p.grams - grams; if (left <= 0) await db.pantry.delete(p.id!); else await db.pantry.update(p.id!, { grams: left }); }
    }
  });
}

function FoodLog() {
  const { targets } = useSettings();
  const [date, setDate] = useState(todayStr());
  const [slot, setSlot] = useState<MealSlot | null>(null);
  const [food, setFood] = useState<FoodT | null>(null);
  const [edit, setEdit] = useState<LogEntry | null>(null);
  const entries = useLiveQuery(() => db.log.where('date').equals(date).toArray(), [date]) ?? [];
  const shift = (d: number) => { const t = new Date(date + 'T12:00'); t.setDate(t.getDate() + d); setDate(todayStr(t)); };
  return (
    <>
      <div className="row" style={{ marginBottom: 10 }}>
        <button className="x" aria-label="Previous day" onClick={() => shift(-1)}>‹</button>
        <div className="grow" style={{ textAlign: 'center', fontWeight: 600 }}>{date === todayStr() ? 'Today' : new Date(date + 'T12:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</div>
        <button className="x" aria-label="Next day" onClick={() => shift(1)}>›</button>
      </div>
      <MacroBars eaten={sumLog(entries)} targets={targets as any} />
      {SLOTS.map((s) => {
        const es = entries.filter((e) => e.slot === s);
        return (
          <div key={s}>
            <div className="row"><h2 className="grow">{s} <span style={{ textTransform: 'none' }}>{es.length ? `· ${r0(sumLog(es).kcal)} kcal` : ''}</span></h2><button className="btn sm" aria-label={`Add to ${s}`} onClick={() => setSlot(s)}>+ Add</button></div>
            {es.map((e) => (
              <button key={e.id} className="card row" style={{ width: '100%', textAlign: 'left', padding: 10 }} onClick={() => setEdit(e)}>
                <span className="grow">{e.name}<div className="muted small">{r0(e.grams)} g</div></span><span className="muted small">{r0(e.kcal)} kcal</span>
              </button>
            ))}
          </div>
        );
      })}
      {slot && !food && <FoodPicker onClose={() => setSlot(null)} onPick={setFood} />}
      {slot && food && <AmountSheet food={food} label={`Add to ${slot}`} onClose={() => { setFood(null); setSlot(null); }} onSave={async (g) => { await addLogEntry(food, g, slot, date); setFood(null); setSlot(null); }} />}
      {edit && (
        <Sheet onClose={() => setEdit(null)}>
          <h2 style={{ marginTop: 0 }}>{edit.name}</h2>
          <EditEntry e={edit} onDone={() => setEdit(null)} />
        </Sheet>
      )}
    </>
  );
}

function EditEntry({ e, onDone }: { e: LogEntry; onDone: () => void }) {
  const [g, setG] = useState(String(e.grams));
  const save = async () => {
    const grams = parseFloat(g) || 0; if (grams <= 0) return;
    const f = await db.foods.get(e.foodId);
    const m = f ? macrosFor(f, grams) : { kcal: (e.kcal / e.grams) * grams, protein: (e.protein / e.grams) * grams, carbs: (e.carbs / e.grams) * grams, fat: (e.fat / e.grams) * grams };
    await db.log.update(e.id!, { grams, ...m }); onDone();
  };
  return (
    <>
      <div className="row"><input className="input grow" inputMode="decimal" value={g} onChange={(x) => setG(x.target.value)} aria-label="Grams" /><span className="muted">grams</span></div>
      <div className="row"><button className="btn danger grow" onClick={async () => { await db.log.delete(e.id!); onDone(); }}>Delete</button><button className="btn primary grow" onClick={save}>Save</button></div>
    </>
  );
}

function Pantry() {
  const items = useLiveQuery(async () => { const p = await db.pantry.toArray(); const fs = await db.foods.bulkGet(p.map((x) => x.foodId)); return p.map((x, i) => ({ ...x, food: fs[i]! })).filter((x) => x.food); }, []) ?? [];
  const [picking, setPicking] = useState(false);
  const [food, setFood] = useState<FoodT | null>(null);
  const [edit, setEdit] = useState<(typeof items)[number] | null>(null);
  const add = async (grams: number) => {
    const have = await db.pantry.where('foodId').equals(food!.id!).first();
    if (have) await db.pantry.update(have.id!, { grams: have.grams + grams }); else await db.pantry.add({ foodId: food!.id!, grams });
    setFood(null); setPicking(false);
  };
  return (
    <>
      <button className="btn primary block" onClick={() => setPicking(true)}>+ Add to pantry (search or scan)</button>
      {!items.length && <div className="empty">Your pantry is empty. Add what you have on hand and Ember can suggest meals.</div>}
      <div style={{ marginTop: 12 }}>
        {items.sort((a, b) => a.food.name.localeCompare(b.food.name)).map((p) => (
          <button key={p.id} className="card row" style={{ width: '100%', textAlign: 'left' }} onClick={() => setEdit(p)}>
            <span className="grow">{p.food.name}{p.food.brand && <span className="muted small"> · {p.food.brand}</span>}</span><b>{r0(p.grams)} g</b>
          </button>
        ))}
      </div>
      {picking && !food && <FoodPicker onClose={() => setPicking(false)} onPick={setFood} />}
      {picking && food && <AmountSheet food={food} label="Add to pantry" onClose={() => { setFood(null); setPicking(false); }} onSave={add} />}
      {edit && (
        <Sheet onClose={() => setEdit(null)}>
          <h2 style={{ marginTop: 0 }}>{edit.food.name}</h2>
          <PantryEdit item={edit} onDone={() => setEdit(null)} />
        </Sheet>
      )}
    </>
  );
}

function PantryEdit({ item, onDone }: { item: { id?: number; grams: number }; onDone: () => void }) {
  const [g, setG] = useState(String(Math.round(item.grams)));
  return (
    <>
      <div className="row"><input className="input grow" inputMode="decimal" aria-label="Grams" value={g} onChange={(e) => setG(e.target.value)} /><span className="muted">grams on hand</span></div>
      <div className="row"><button className="btn danger grow" onClick={async () => { await db.pantry.delete(item.id!); onDone(); }}>Remove</button>
        <button className="btn primary grow" onClick={async () => { const n = parseFloat(g) || 0; if (n <= 0) await db.pantry.delete(item.id!); else await db.pantry.update(item.id!, { grams: n }); onDone(); }}>Save</button></div>
    </>
  );
}

export { remaining };
