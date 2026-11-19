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
