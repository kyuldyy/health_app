import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { e1rm, exerciseHistory, fmtWeight, personalRecords, toDisplay } from '../lib/stats';
import { AreaChart, Icon, Segmented, useSettings } from '../ui';

type Range = '1M' | '3M' | '1Y' | 'All';
const DAYS: Record<Range, number> = { '1M': 30, '3M': 91, '1Y': 365, All: 36500 };

/** Full-screen per-exercise progress, closed with the X. */
export function ExerciseProgress({ exerciseId, name, onClose }: { exerciseId: number; name: string; onClose: () => void }) {
  const { unit } = useSettings();
  const [range, setRange] = useState<Range>('3M');
  const workouts = useLiveQuery(() => db.workouts.toArray(), []) ?? [];
  const all = exerciseHistory(workouts, exerciseId);
  const cutoff = Date.now() - DAYS[range] * 864e5;
  const hist = all.filter((h) => h.date >= cutoff);
  const pr = personalRecords(all);
  const latest = all[all.length - 1];
  const delta = hist.length > 1 ? hist[hist.length - 1].bestE1rm - hist[0].bestE1rm : 0;
  const bestSet = all.flatMap((h) => h.sets).sort((a, b) => b.weight - a.weight || b.reps - a.reps)[0];
  const weeks = Math.max(1, Math.min(DAYS[range], (Date.now() - (hist[0]?.date ?? Date.now())) / 864e5) / 7);
  const volWk = hist.reduce((a, h) => a + h.volume, 0) / weeks;
  return (
    <div className="full">
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div className="grow"><div className="eyebrow">Progress</div><h1 style={{ margin: 0 }}>{name}</h1></div>
        <button className="x" aria-label="Close" onClick={onClose}><Icon name="close" size={18} /></button>
      </div>
      <div className="eyebrow" style={{ marginTop: 18 }}>Estimated 1RM</div>
      <div className="row" style={{ alignItems: 'baseline', gap: 6 }}>
        <span className="big" style={{ fontSize: 56 }}>{latest ? fmtWeight(latest.bestE1rm, unit) : '–'}</span><span className="muted">{unit}</span>
      </div>
      {hist.length > 1 && <div style={{ color: delta >= 0 ? 'var(--food)' : 'var(--fail)', fontSize: 13, fontWeight: 600 }}>{delta >= 0 ? '+' : '−'}{fmtWeight(Math.abs(delta), unit)} {unit} in {range === 'All' ? 'total' : range === '1M' ? '1 month' : range === '3M' ? '3 months' : '1 year'}</div>}
      <div style={{ margin: '12px 0' }}><AreaChart unit={unit} points={hist.map((h) => ({ x: h.date, y: toDisplay(h.bestE1rm, unit) }))} /></div>
      <Segmented value={range} onChange={setRange} options={(['1M', '3M', '1Y', 'All'] as Range[]).map((r) => ({ id: r, label: r }))} />
      <div className="row" style={{ borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', padding: '12px 0', margin: '4px 0 14px' }}>
        <div className="grow"><div className="eyebrow" style={{ margin: 0 }}>Best set</div><div className="big">{bestSet ? `${fmtWeight(bestSet.weight, unit)}×${bestSet.reps}` : '–'}</div></div>
        <div className="grow"><div className="eyebrow" style={{ margin: 0 }}>Volume/wk</div><div className="big">{fmtWeight(volWk, unit)}</div></div>
        <div className="grow"><div className="eyebrow" style={{ margin: 0 }}>Sessions</div><div className="big">{all.length}</div></div>
      </div>
      <div className="row eyebrow"><span className="grow">History</span><span>e1RM</span></div>
      {!all.length && <div className="empty">No finished sessions yet.</div>}
      {[...all].reverse().map((h) => {
        const top = [...h.sets].sort((a, b) => b.weight - a.weight)[0];
        return (
          <div className="row" key={h.workoutId} style={{ padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
            <span className="grow">{new Date(h.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            <span className="muted small">{fmtWeight(top.weight, unit)} × {top.reps}{h.sets.length > 1 ? ` +${h.sets.length - 1}` : ''}</span>
            <b style={{ width: 56, textAlign: 'right' }}>{fmtWeight(e1rm(top.weight, top.reps) > h.bestE1rm ? e1rm(top.weight, top.reps) : h.bestE1rm, unit)}{h.topWeight === pr.heaviest && h.topWeight > 0 ? <span style={{ color: 'var(--train)', fontSize: 10 }}> PR</span> : null}</b>
          </div>
        );
      })}
    </div>
  );
}
