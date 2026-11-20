import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, DEFAULT_SETTINGS } from './db';

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
export const useSettings = () => ({ ...DEFAULT_SETTINGS, ...(useLiveQuery(() => db.settings.get('main'), []) ?? {}) });

export function Sheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

export function Menu({ items }: { items: { label: string; onClick: () => void; danger?: boolean }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="x" aria-label="More" onClick={() => setOpen(!open)}>⋯</button>
      {open && (
        <div className="menu">
          {items.map((i) => (
            <button key={i.label} className={i.danger ? 'danger' : ''} style={i.danger ? { color: 'var(--fail)' } : undefined}
              onClick={() => { setOpen(false); i.onClick(); }}>{i.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

export function LineChart({ points, unit }: { points: { x: number; y: number }[]; unit: string }) {
  if (points.length < 2) return <div className="empty small">Log at least two sessions to see a chart.</div>;
  const W = 320, H = 150, P = 24;
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const sx = (x: number) => P + ((x - x0) / (x1 - x0 || 1)) * (W - 2 * P);
  const sy = (y: number) => H - P - ((y - y0) / (y1 - y0 || 1)) * (H - 2 * P);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Progress chart">
      <path d={d} fill="none" stroke="var(--train)" strokeWidth="2.5" strokeLinejoin="round" />
      {points.map((p, i) => <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r="3.5" fill="var(--train)" />)}
      <text x={P} y={12} fontSize="10" fill="var(--muted)">{Math.round(y1)} {unit}</text>
      <text x={P} y={H - 6} fontSize="10" fill="var(--muted)">{Math.round(y0)} {unit}</text>
    </svg>
  );
}

const ICONS: Record<string, string> = {
  home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  train: 'M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11',
  food: 'M3 12h18a9 9 0 0 1-18 0zM8 8c0-1.5 1-1.5 1-3M12 8c0-1.5 1-1.5 1-3M16 8c0-1.5 1-1.5 1-3',
  you: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-7 8-7s8 3 8 7',
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  chart: 'M5 20V11M11 20V5M17 20v-8',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.5-4.5',
  barcode: 'M4 5v14M7.5 5v14M11 5v14M14 5v14M17.5 5v14M20.5 5v14',
  close: 'M6 6l12 12M18 6L6 18',
  chevron: 'M9 6l6 6-6 6',
  spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z',
  refresh: 'M20 12a8 8 0 1 1-2.3-5.7M20 4v4h-4',
};
export function Icon({ name, size = 22 }: { name: keyof typeof ICONS | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="seg" role="tablist">
      {options.map((o) => <button key={o.id} role="tab" aria-selected={value === o.id} className={value === o.id ? 'on' : ''} onClick={() => onChange(o.id)}>{o.label}</button>)}
    </div>
  );
}

export function CalorieRing({ eaten, target, size = 96 }: { eaten: number; target: number; size?: number }) {
  const r = size / 2 - 7, c = 2 * Math.PI * r, frac = Math.min(1, eaten / (target || 1));
  const left = Math.round(target - eaten);
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--card-2)" strokeWidth="9" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--food)" strokeWidth="9" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <div className="ringtxt"><b>{Math.abs(left).toLocaleString()}</b><span>{left < 0 ? 'KCAL OVER' : 'KCAL LEFT'}</span></div>
    </div>
  );
}

export function AreaChart({ points, unit }: { points: { x: number; y: number }[]; unit: string }) {
  if (points.length < 2) return <div className="empty small">Log at least two sessions to see a chart.</div>;
  const W = 340, H = 170, PL = 34, PR = 8, PT = 10, PB = 22;
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const pad = (Math.max(...ys) - Math.min(...ys)) * 0.15 || 1;
  const y0 = Math.min(...ys) - pad, y1 = Math.max(...ys) + pad;
  const sx = (x: number) => PL + ((x - x0) / (x1 - x0 || 1)) * (W - PL - PR);
  const sy = (y: number) => H - PB - ((y - y0) / (y1 - y0 || 1)) * (H - PT - PB);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
  const area = `${line} L${sx(x1)},${H - PB} L${sx(x0)},${H - PB} Z`;
  const ticks = [0, 1, 2, 3].map((i) => y0 + ((y1 - y0) * i) / 3);
  const last = points[points.length - 1];
  const d = (t: number) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Progress chart in ${unit}`}>
      <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--train)" stopOpacity=".35" /><stop offset="1" stopColor="var(--train)" stopOpacity="0" /></linearGradient></defs>
      {ticks.map((t, i) => <g key={i}><line x1={PL} x2={W - PR} y1={sy(t)} y2={sy(t)} stroke="var(--line)" strokeWidth="1" strokeDasharray="2 4" /><text x={PL - 6} y={sy(t) + 3} fontSize="9" textAnchor="end" fill="var(--muted)">{Math.round(t)}</text></g>)}
      <path d={area} fill="url(#ag)" />
      <path d={line} fill="none" stroke="var(--train)" strokeWidth="2.2" strokeLinejoin="round" />
      <circle cx={sx(last.x)} cy={sy(last.y)} r="4.5" fill="var(--bg)" stroke="var(--train)" strokeWidth="2.2" />
      <text x={PL} y={H - 6} fontSize="9" fill="var(--muted)">{d(x0)}</text>
      <text x={W - PR} y={H - 6} fontSize="9" textAnchor="end" fill="var(--muted)">{d(x1)}</text>
    </svg>
  );
}
