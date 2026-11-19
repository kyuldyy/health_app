import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Food } from '../types';
import { lookupBarcode, searchOnline } from '../lib/foodApi';
import { Sheet } from '../ui';

async function saveFood(f: Food): Promise<Food> {
  if (f.id) return f;
  const existing = f.barcode ? await db.foods.where('barcode').equals(f.barcode).first() : await db.foods.where('name').equals(f.name).filter((x) => x.brand === f.brand).first();
  if (existing) return existing;
  const id = await db.foods.add(f);
  return { ...f, id };
}

function Scanner({ onCode, onClose }: { onCode: (c: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [manual, setManual] = useState('');
  const [err, setErr] = useState('');
  const supported = typeof (window as any).BarcodeDetector !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  useEffect(() => {
    if (!supported) return;
    let stop = false, stream: MediaStream | undefined;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (!video.current) return;
        video.current.srcObject = stream; await video.current.play();
        const det = new (window as any).BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
        const tick = async () => {
          if (stop) return;
          try { const r = await det.detect(video.current!); if (r[0]) { onCode(r[0].rawValue); return; } } catch { /* keep scanning */ }
          setTimeout(tick, 300);
        };
        tick();
      } catch { setErr('Camera unavailable. Type the barcode instead.'); }
    })();
    return () => { stop = true; stream?.getTracks().forEach((t) => t.stop()); };
  }, []); // eslint-disable-line
  return (
    <div>
      {supported && !err && <video ref={video} playsInline muted style={{ width: '100%', borderRadius: 14, background: '#000', aspectRatio: '4/3', objectFit: 'cover' }} />}
      {(!supported || err) && <p className="muted small">{err || 'Camera scanning isn’t supported in this browser. Type the barcode instead.'}</p>}
      <div className="row" style={{ marginTop: 10 }}>
        <input className="input grow" style={{ margin: 0 }} inputMode="numeric" placeholder="Barcode number" value={manual} onChange={(e) => setManual(e.target.value)} />
        <button className="btn primary" disabled={!manual} onClick={() => onCode(manual)}>Look up</button>
      </div>
      <button className="btn block" style={{ marginTop: 10 }} onClick={onClose}>Back</button>
    </div>
  );
}

function CustomForm({ initial, onSave, onCancel }: { initial?: string; onSave: (f: Food) => void; onCancel: () => void }) {
  const [v, setV] = useState({ name: initial ?? '', kcal: '', protein: '', carbs: '', fat: '', servingG: '' });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });
  const n = (s: string) => parseFloat(s) || 0;
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Custom food (per 100 g)</h2>
      <input className="input" placeholder="Name" value={v.name} onChange={set('name')} />
      <div className="row">{(['kcal', 'protein', 'carbs', 'fat'] as const).map((k) => <input key={k} className="input" inputMode="decimal" placeholder={k} aria-label={k} value={v[k]} onChange={set(k)} />)}</div>
      <input className="input" inputMode="decimal" placeholder="Typical serving (g), optional" value={v.servingG} onChange={set('servingG')} />
      <div className="row"><button className="btn grow" onClick={onCancel}>Cancel</button>
        <button className="btn primary grow" disabled={!v.name.trim()} onClick={() => onSave({ name: v.name.trim(), kcal: n(v.kcal), protein: n(v.protein), carbs: n(v.carbs), fat: n(v.fat), servingG: n(v.servingG) || undefined, source: 'custom' })}>Save</button></div>
    </div>
  );
}

export function FoodPicker({ onPick, onClose }: { onPick: (f: Food) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [mode, setMode] = useState<'search' | 'scan' | 'custom'>('search');
  const [online, setOnline] = useState<Food[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const local = useLiveQuery(() => db.foods.orderBy('name').toArray(), []) ?? [];
  const shown = local.filter((f) => (f.name + ' ' + (f.brand ?? '')).toLowerCase().includes(q.toLowerCase())).slice(0, 30);

  const pick = async (f: Food) => onPick(await saveFood(f));
  const search = async () => {
    if (!q.trim()) return;
    setBusy(true); setMsg(''); setOnline([]);
    try { const r = await searchOnline(q.trim()); setOnline(r); if (!r.length) setMsg('No results online.'); } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  };
  const code = async (c: string) => {
    setMode('search'); setBusy(true); setMsg('');
    try {
      const have = await db.foods.where('barcode').equals(c.replace(/\D/g, '')).first();
      const f = have ?? (await lookupBarcode(c));
      if (f) await pick(f); else setMsg(`No product found for ${c}. You can add it as a custom food.`);
    } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  };

  return (
    <Sheet onClose={onClose}>
      {mode === 'scan' && <Scanner onCode={code} onClose={() => setMode('search')} />}
      {mode === 'custom' && <CustomForm initial={q} onCancel={() => setMode('search')} onSave={async (f) => pick(f)} />}
      {mode === 'search' && (
        <>
          <div className="row">
            <input className="input grow" style={{ margin: 0 }} autoFocus placeholder="Search foods" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} />
            <button className="btn" aria-label="Scan barcode" onClick={() => setMode('scan')}>Scan</button>
          </div>
          <div className="row" style={{ margin: '10px 0' }}>
            <button className="btn sm grow" onClick={search} disabled={busy || !q.trim()}>{busy ? 'Searching…' : 'Search online'}</button>
            <button className="btn sm grow" onClick={() => setMode('custom')}>Add custom</button>
          </div>
          {msg && <div className="muted small" style={{ marginBottom: 8 }}>{msg}</div>}
          <div className="list">
            {shown.map((f) => <FoodRow key={'l' + f.id} f={f} onClick={() => pick(f)} />)}
            {online.length > 0 && <h2>Online results</h2>}
            {online.map((f, i) => <FoodRow key={'o' + i} f={f} onClick={() => pick(f)} />)}
          </div>
        </>
      )}
    </Sheet>
  );
}

const FoodRow = ({ f, onClick }: { f: Food; onClick: () => void }) => (
  <button className="item" onClick={onClick}>
    <span className="grow"><div>{f.name}</div><div className="muted small">{f.brand ? f.brand + ' · ' : ''}{Math.round(f.kcal)} kcal · P{Math.round(f.protein)} C{Math.round(f.carbs)} F{Math.round(f.fat)} /100g</div></span>
  </button>
);
