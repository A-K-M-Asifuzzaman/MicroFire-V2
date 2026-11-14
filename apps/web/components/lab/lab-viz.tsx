// Flame Lab visuals (pure SVG, server- and client-safe). Toy-model visuals say so; evidence rows come from the engine.
import { GRAVITY, PROTOCOL, sweep, toyFlame, type Gravity, type Phase, type Settings } from '../../lib/lab-engine';

/** A dial gauge. `tone` marks toy-model readouts versus settings. */
export function Gauge({ label, value, unit, min, max, tone = 'setting', display }: { label: string; value: number | null; unit: string; min: number; max: number; tone?: 'setting' | 'toy' | 'clock'; display?: string }) {
  const f = value === null ? 0 : Math.min(1, Math.max(0, (value - min) / (max - min)));
  const a0 = Math.PI * 0.8, a1 = Math.PI * 2.2, a = a0 + (a1 - a0) * f, r = 34, cx = 44, cy = 44;
  const pt = (t: number, rr = r) => `${cx + Math.cos(t) * rr} ${cy + Math.sin(t) * rr}`;
  const arc = (t: number) => `M${pt(a0)} A${r} ${r} 0 ${t - a0 > Math.PI ? 1 : 0} 1 ${pt(t)}`;
  return <figure className="lab-gauge" data-tone={tone}>
    <svg viewBox="0 0 88 70" aria-hidden="true">
      <path d={arc(a1)} className="lab-gauge-track" />
      {value !== null && <path d={arc(a)} className="lab-gauge-fill" />}
      {value !== null && <line x1={cx} y1={cy} x2={cx + Math.cos(a) * 26} y2={cy + Math.sin(a) * 26} className="lab-gauge-needle" />}
      <circle cx={cx} cy={cy} r="4" className="lab-gauge-hub" />
    </svg>
    <figcaption><b>{display ?? (value === null ? 'not set' : `${value}${unit ? ` ${unit}` : ''}`)}</b><span>{label}</span>{tone === 'toy' && <em>toy model</em>}</figcaption>
  </figure>;
}

/** One small illustrated flame (toy model), used in the gravity strip. */
export function MiniFlame({ g, o2, flow, pressure, label, active }: { g: number; o2: number; flow: number; pressure: number | null; label: string; active?: boolean }) {
  const t = toyFlame({ g, o2, flow, pressure }), rx = 16 * t.size, ry = 16 * t.size * t.stretch * 0.62;
  const hot = `rgb(${Math.round(255 - t.blue * 175)}, ${Math.round(150 + t.blue * 40)}, ${Math.round(40 + t.blue * 215)})`;
  return <figure className="lab-mini" data-active={active || undefined}>
    <svg viewBox="0 0 80 80" aria-hidden="true"><rect width="80" height="80" rx="12" className="lab-mini-bg" /><rect x="14" y="60" width="52" height="4" rx="2" fill="#d9dde8" />
      <g transform={`translate(40 62) skewX(${t.lean * 35})`}><ellipse cx="0" cy={-ry * 0.55} rx={rx} ry={ry} fill={hot} opacity={t.brightness} /><ellipse cx="0" cy={-ry * 0.35} rx={rx * 0.45} ry={ry * 0.5} fill="#fff6d8" opacity={t.brightness * 0.5} /></g></svg>
    <figcaption>{label}</figcaption>
  </figure>;
}

export function GravityStrip({ s }: { s: Settings }) {
  return <div className="lab-strip" role="img" aria-label={`Toy-model flames at ${s.o2} vol% oxygen and ${s.flow} cm/s airflow in four gravity levels: taller with more buoyancy, rounder and bluer with less.`}>
    {(Object.keys(GRAVITY) as Gravity[]).map((k) => <MiniFlame key={k} g={GRAVITY[k].g} o2={s.o2} flow={s.flow} pressure={s.pressure} label={GRAVITY[k].label} active={k === s.gravity} />)}
  </div>;
}

/** Direction-of-effect chart: toy flame height and width across gravity, at the current oxygen and airflow. */
export function SweepChart({ s }: { s: Settings }) {
  const pts = sweep(s), W = 320, H = 160, P = 30, maxH = 3.5;
  const x = (g: number) => P + g * (W - P - 10), y = (v: number) => H - P - (v / maxH) * (H - P - 12);
  const line = (k: 'height' | 'width') => pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.g).toFixed(1)} ${y(p[k]).toFixed(1)}`).join(' ');
  const cur = GRAVITY[s.gravity].g, here = pts.reduce((a, b) => Math.abs(b.g - cur) < Math.abs(a.g - cur) ? b : a);
  return <figure className="lab-chart">
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Toy model: flame height grows with gravity from ${pts[0]!.height.toFixed(2)} to ${pts.at(-1)!.height.toFixed(2)} (relative units) at the current oxygen and airflow. Not data.`}>
      <line x1={P} y1={H - P} x2={W - 8} y2={H - P} className="lab-axis" /><line x1={P} y1={10} x2={P} y2={H - P} className="lab-axis" />
      {[0, 0.17, 0.38, 1].map((g) => <g key={g}><line x1={x(g)} y1={H - P} x2={x(g)} y2={H - P + 4} className="lab-axis" /><text x={x(g)} y={H - P + 15} textAnchor="middle" className="lab-tick">{g === 0 ? '0 g' : g === 1 ? '1 g' : `${g}`}</text></g>)}
      <path d={line('height')} className="lab-line-h" /><path d={line('width')} className="lab-line-w" />
      <circle cx={x(here.g)} cy={y(here.height)} r="5" className="lab-dot" />
      <text x={W - 10} y={y(pts.at(-1)!.height) - 6} textAnchor="end" className="lab-lbl">height</text>
      <text x={W - 10} y={y(pts.at(-1)!.width) + 14} textAnchor="end" className="lab-lbl">width</text>
      <text x={P + 4} y={20} className="lab-lbl">relative size (toy units)</text>
      <text x={(W + P) / 2} y={H - 2} textAnchor="middle" className="lab-tick">gravity level</text>
    </svg>
    <figcaption><span className="lab-kind" data-kind="toy">toy model</span> Directions of effect only: buoyancy makes the illustrated flame taller. Real flames depend on many more conditions.</figcaption>
  </figure>;
}

export function ProtocolRail({ phase }: { phase: Phase }) {
  const at = PROTOCOL.findIndex((p) => p.id === phase);
  return <ol className="lab-rail" aria-label="Run sequence">
    {PROTOCOL.map((p, i) => <li key={p.id} data-state={i < at ? 'done' : i === at ? 'now' : 'next'} aria-current={i === at ? 'step' : undefined}><span>{String(i + 1).padStart(2, '0')}</span>{p.label}</li>)}
  </ol>;
}

const STATUS: Record<string, [string, string]> = {
  'exact-recorded': ['same as B20', 'match'], 'conditions-differ': ['differs from B20', 'differ'], 'source-not-recorded': ['not reported for B20', 'unknown'],
  'context-only': ['context only', 'unknown'], 'non-exact-retrieval-match': ['similar, not equal', 'differ'],
};
const LABEL: Record<string, string> = { gravity: 'Gravity', material: 'Material', oxygenPct: 'Oxygen', flowCmS: 'Airflow', pressureKpa: 'Pressure', geometry: 'Geometry' };
const UNIT: Record<string, string> = { oxygenPct: 'vol%', flowCmS: 'cm/s', pressureKpa: 'kPa' };
export function EvidenceMatrix({ rows }: { rows: { field: string; status: string; source: string | number | null; target: string | number | null; unit: string | null }[] }) {
  return <div className="lab-scroll" role="region" aria-label="Your run compared with BASS-II test B20" tabIndex={0}>
    <table className="lab-matrix"><caption>Your run against what NASA recorded for B20 (engine: condition-transfer-v1)</caption>
      <thead><tr><th scope="col">Condition</th><th scope="col">Your run</th><th scope="col">B20 recorded</th><th scope="col">Result</th></tr></thead>
      <tbody>{rows.map((r) => <tr key={r.field}><th scope="row">{LABEL[r.field] ?? r.field}</th>
        <td>{r.target === null ? '—' : `${r.target}${UNIT[r.field] ? ` ${UNIT[r.field]}` : ''}`}</td>
        <td>{r.source === null ? 'not reported' : `${r.source}${r.unit ? ` ${r.unit}` : ''}`}</td>
        <td><span className="lab-chip" data-kind={STATUS[r.status]?.[1] ?? 'unknown'}>{STATUS[r.status]?.[0] ?? r.status}</span></td></tr>)}</tbody></table>
  </div>;
}
