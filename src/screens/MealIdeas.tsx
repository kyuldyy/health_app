import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Food, MealSlot, Recipe } from '../types';
import { addMacros, macrosFor, r0, remaining, sumLog, todayStr, ZERO } from '../lib/macros';
import { askClaude, buildPrompt, recipesFromPantry, type MealIdea } from '../lib/mealIdeas';
import { useSettings } from '../ui';
import { addLogEntry } from './Food';

export function MealIdeas() {
  const s = useSettings();
  const pantry = useLiveQuery(async () => { const p = await db.pantry.toArray(); const fs = await db.foods.bulkGet(p.map((x) => x.foodId)); return p.map((x, i) => ({ ...x, food: fs[i]! })).filter((x) => x.food); }, []) ?? [];
  const recipes = useLiveQuery(() => db.recipes.toArray(), []) ?? [];
  const allFoods = useLiveQuery(() => db.foods.toArray(), []) ?? [];
  const today = useLiveQuery(() => db.log.where('date').equals(todayStr()).toArray(), []) ?? [];
  const [slot, setSlot] = useState<MealSlot>('Dinner');
  const [ideas, setIdeas] = useState<MealIdea[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [keyDraft, setKeyDraft] = useState('');
  const left = remaining(s.targets as any, sumLog(today));
  const doable = recipesFromPantry(recipes, pantry, new Map(allFoods.map((f) => [f.id!, f])));

  const ask = async () => {
    setBusy(true); setErr('');
    try { setIdeas(await askClaude(s.claudeKey!, buildPrompt(pantry.map((p) => ({ name: p.food.name, grams: p.grams })), left, slot))); } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };
  const saveIdea = (i: MealIdea) => db.log.add({ date: todayStr(), slot, foodId: 0, name: i.name, grams: i.ingredients.reduce((a, x) => a + x.grams, 0), kcal: i.kcal, protein: i.protein, carbs: i.carbs, fat: i.fat });
  const cook = async (r: Recipe & { kcal: number; protein: number; carbs: number; fat: number }) => {
    for (const ing of r.ingredients) { const f = allFoods.find((x) => x.id === ing.foodId); if (f) await addLogEntry(f, ing.grams, slot); }
  };

  return (
    <>
      <div className="card small"><b>Left today:</b> {r0(left.kcal)} kcal · P {r0(left.protein)} · C {r0(left.carbs)} · F {r0(left.fat)}</div>
      <div>{(['Breakfast', 'Lunch', 'Dinner', 'Snack'] as MealSlot[]).map((x) => <button key={x} className={'chip' + (slot === x ? ' on' : '')} onClick={() => setSlot(x)}>{x}</button>)}</div>

      <h2>Ask Claude</h2>
      {!s.claudeKey ? (
        <div className="card">
          <p className="small muted" style={{ marginTop: 0 }}>Paste an Anthropic API key to get AI meal ideas from your pantry and remaining macros. It is stored only on this device and sent only to Anthropic.</p>
          <input className="input" type="password" placeholder="sk-ant-…" value={keyDraft} onChange={(e) => setKeyDraft(e.target.value)} />
          <button className="btn primary block" disabled={!keyDraft.trim()} onClick={() => db.settings.put({ ...s, claudeKey: keyDraft.trim() })}>Save key</button>
        </div>
      ) : (
        <>
          <button className="btn primary block" disabled={busy || !pantry.length} onClick={ask}>{busy ? 'Thinking…' : 'Suggest meals from my pantry'}</button>
          {!pantry.length && <p className="muted small">Add items to your pantry first.</p>}
          <button className="btn sm" style={{ marginTop: 8 }} onClick={() => db.settings.put({ ...s, claudeKey: undefined })}>Remove API key</button>
        </>
      )}
      {err && <p style={{ color: 'var(--fail)' }} className="small">{err}</p>}
      {ideas.map((i, k) => (
        <div className="card" key={k} style={{ marginTop: 10 }}>
          <b>{i.name}</b><div className="muted small">{i.description}</div>
          <div className="small" style={{ margin: '6px 0' }}>{i.ingredients.map((x) => `${x.name} ${r0(x.grams)}g`).join(', ')}</div>
          <div className="small muted">{r0(i.kcal)} kcal · P {r0(i.protein)} · C {r0(i.carbs)} · F {r0(i.fat)}</div>
          <button className="btn sm" style={{ marginTop: 8 }} onClick={() => saveIdea(i)}>Log as {slot}</button>
        </div>
      ))}

      <h2>Saved meals you can make now</h2>
      {!doable.length && <div className="muted small">Nothing yet. Save meals below and they show up here when your pantry covers them.</div>}
      {doable.map((r) => (
        <div className="card" key={r.id}>
          <div className="row"><b className="grow">{r.name}</b><span className="muted small">{r0(r.kcal)} kcal · P {r0(r.protein)}</span></div>
          <button className="btn sm" style={{ marginTop: 8 }} onClick={() => cook(r)}>Log as {slot} (uses pantry)</button>
        </div>
      ))}
      <Recipes foods={allFoods} recipes={recipes} />
    </>
  );
}

function Recipes({ foods, recipes }: { foods: Food[]; recipes: Recipe[] }) {
  const [name, setName] = useState('');
  const today = useLiveQuery(() => db.log.where('date').equals(todayStr()).toArray(), []) ?? [];
  const save = async () => {
    const byFood = new Map<number, { foodId: number; name: string; grams: number }>();
    for (const e of today) if (e.foodId) { const x = byFood.get(e.foodId) ?? { foodId: e.foodId, name: e.name, grams: 0 }; x.grams += e.grams; byFood.set(e.foodId, x); }
    await db.recipes.add({ name: name.trim(), ingredients: [...byFood.values()] }); setName('');
  };
  const total = (r: Recipe) => r.ingredients.reduce((a, i) => { const f = foods.find((x) => x.id === i.foodId); return f ? addMacros(a, macrosFor(f, i.grams)) : a; }, ZERO);
  return (
    <>
      <h2>Saved meals</h2>
      <div className="row"><input className="input grow" style={{ margin: 0 }} placeholder="Name today’s foods as a meal" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn" disabled={!name.trim() || !today.some((e) => e.foodId)} onClick={save}>Save</button></div>
      {recipes.map((r) => (
        <div key={r.id} className="card row" style={{ marginTop: 8 }}>
          <span className="grow">{r.name}<div className="muted small">{r.ingredients.map((i) => i.name).join(', ')} · {r0(total(r).kcal)} kcal</div></span>
          <button className="btn sm danger" onClick={() => db.recipes.delete(r.id!)}>Delete</button>
        </div>
      ))}
    </>
  );
}
