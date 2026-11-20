import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Food as FoodT, LogEntry, MealSlot } from '../types';
import { macrosFor, r0, remaining, sumLog, todayStr } from '../lib/macros';
import { CalorieRing, Icon, Segmented, Sheet, useSettings } from '../ui';
import { FoodPicker } from './FoodPicker';
import { MealIdeas } from './MealIdeas';

const SLOTS: MealSlot[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

type M = ReturnType<typeof sumLog>;
export function MacroRows({ eaten, targets, compact }: { eaten: M; targets: M; compact?: boolean }) {
  const rows: [string, keyof M, string][] = [['Protein', 'protein', 'var(--protein)'], ['Carbs', 'carbs', 'var(--carbs)'], ['Fat', 'fat', 'var(--fat)']];
  return (
    <div>
      {rows.map(([l, k, c]) => (
        <div key={k} className="mrow">
          <div className="l"><span style={{ color: 'var(--fg)' }}>{l}</span><span className="grow" style={{ textAlign: 'right' }}>{r0(eaten[k])} / {r0(targets[k])}g</span></div>
          <div className="bar" style={{ height: compact ? 5 : 6 }}><i style={{ width: Math.min(100, (eaten[k] / (targets[k] || 1)) * 100) + '%', background: c }} /></div>
        </div>
      ))}
    </div>
  );
}

export function MacroCard({ eaten, targets }: { eaten: M; targets: M }) {
  return (
    <div className="card row" style={{ gap: 16 }}>
      <CalorieRing eaten={eaten.kcal} target={targets.kcal} size={112} />
      <div className="grow"><div className="muted small" style={{ marginBottom: 8 }}>of {r0(targets.kcal).toLocaleString()} kcal</div><MacroRows eaten={eaten} targets={targets} /></div>
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
  const [sub, setSub] = useState<'pantry' | 'ideas' | 'macros'>('macros');
  return (
    <>
      <h1>Food</h1>
      <Segmented value={sub} onChange={setSub} options={[{ id: 'pantry', label: 'Pantry' }, { id: 'ideas', label: 'Meal ideas' }, { id: 'macros', label: 'Macros' }]} />
      {sub === 'macros' && <FoodLog />}
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
      <MacroCard eaten={sumLog(entries)} targets={targets as any} />
      {SLOTS.map((s) => {
        const es = entries.filter((e) => e.slot === s);
        return (
          <div key={s} style={{ marginTop: 18 }}>
            <div className="row"><div className="eyebrow grow" style={{ margin: 0 }}>{s}{es.length ? ` · ${r0(sumLog(es).kcal)} kcal` : ''}</div><button className="iconbtn" aria-label={`Add to ${s}`} onClick={() => setSlot(s)}><Icon name="plus" size={18} /></button></div>
            {es.map((e) => (
              <button key={e.id} className="row" style={{ width: '100%', textAlign: 'left', padding: '10px 0', borderBottom: '1px solid var(--line)' }} onClick={() => setEdit(e)}>
                <span className="grow"><div style={{ fontWeight: 600 }}>{e.name}</div><div className="muted small">P {r0(e.protein)} · C {r0(e.carbs)} · F {r0(e.fat)} · {r0(e.grams)} g</div></span>
                <span style={{ textAlign: 'right' }}><b style={{ fontSize: 17 }}>{r0(e.kcal)}</b><div className="muted" style={{ fontSize: 10 }}>KCAL</div></span>
              </button>
            ))}
          </div>
        );
      })}
      <WeekChart target={(targets as any).kcal} />
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

function WeekChart({ target }: { target: number }) {
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d; });
  const from = todayStr(days[0]);
  const rows = useLiveQuery(() => db.log.where('date').aboveOrEqual(from).toArray(), [from]) ?? [];
  const totals = days.map((d) => sumLog(rows.filter((r) => r.date === todayStr(d))).kcal);
  const max = Math.max(target, ...totals, 1);
  return (
    <div className="card" style={{ marginTop: 22 }}>
      <div className="row"><div className="eyebrow grow" style={{ margin: 0 }}>Last 7 days</div><span className="muted small">Target {r0(target).toLocaleString()}</span></div>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: 8, height: 90, marginTop: 12 }}>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: `${(target / max) * 100}%`, borderTop: '1px dashed var(--line)' }} />
        {totals.map((t, i) => <div key={i} style={{ flex: 1, textAlign: 'center' }}><div style={{ height: Math.max(3, (t / max) * 82), background: t ? 'var(--food)' : 'var(--card-2)', borderRadius: 4 }} /><div className="muted" style={{ fontSize: 10, marginTop: 4 }}>{days[i].toLocaleDateString(undefined, { weekday: 'narrow' })}</div></div>)}
      </div>
    </div>
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
  const [picking, setPicking] = useState<false | 'search' | 'scan'>(false);
  const [food, setFood] = useState<FoodT | null>(null);
  const [edit, setEdit] = useState<(typeof items)[number] | null>(null);
  const [q, setQ] = useState('');
  const add = async (grams: number) => {
    const have = await db.pantry.where('foodId').equals(food!.id!).first();
    if (have) await db.pantry.update(have.id!, { grams: have.grams + grams }); else await db.pantry.add({ foodId: food!.id!, grams });
    setFood(null); setPicking(false);
  };
  const shown = items.filter((p) => p.food.name.toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.food.name.localeCompare(b.food.name));
  const qty = (g: number) => (g >= 1000 ? `${Math.round(g / 100) / 10} kg` : `${r0(g)} g`);
  const src = { custom: 'CUSTOM', off: 'OPEN FOOD FACTS', usda: 'USDA' } as const;
  return (
    <>
      <div className="row" style={{ marginBottom: 12 }}>
        <label className="row grow" style={{ background: 'var(--card)', borderRadius: 14, padding: '0 14px', gap: 8 }}>
          <Icon name="search" size={18} />
          <input aria-label="Find an ingredient" style={{ background: 'none', border: 0, outline: 0, padding: '12px 0', width: '100%' }} placeholder="Add or find an ingredient" value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => undefined} />
        </label>
        <button className="btn go" aria-label="Scan barcode" style={{ padding: '12px 14px' }} onClick={() => setPicking('scan')}><Icon name="barcode" size={22} /></button>
      </div>
      <button className="btn block" onClick={() => setPicking('search')}>+ Add to pantry</button>
      {!items.length && <div className="empty">Your pantry is empty. Add what you have on hand and Ember can suggest meals.</div>}
      <div style={{ marginTop: 6 }}>
        {shown.map((p) => (
          <button key={p.id} className="row" style={{ width: '100%', textAlign: 'left', padding: '12px 0', borderBottom: '1px solid var(--line)' }} onClick={() => setEdit(p)}>
            <span className="grow"><div style={{ fontWeight: 600 }}>{p.food.name}</div><div className="muted small">{r0(p.food.kcal)} kcal · {r0(p.food.protein)}g P per 100 g</div></span>
            <span style={{ textAlign: 'right' }}><b>{qty(p.grams)}</b><div className="muted" style={{ fontSize: 10, letterSpacing: '.06em' }}>{src[p.food.source]}</div></span>
          </button>
        ))}
      </div>
      {picking && !food && <FoodPicker startScan={picking === 'scan'} onClose={() => setPicking(false)} onPick={setFood} />}
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
